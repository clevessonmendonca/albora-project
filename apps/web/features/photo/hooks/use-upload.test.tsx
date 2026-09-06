import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FotoProcessada, QueueItem, RespostaPresign } from "@albora/core";
import type * as AlboraCoreNS from "@albora/core";
import { processarFoto } from "@albora/core";
import { deviceDecodes, prepareVideo } from "@/lib/image";
import { QueueQuotaExceededError, queueSummary, webQueue } from "@/lib/queue";
import { webTransport } from "@/lib/transport";
import { mensagemCotaVideo, useUpload, type CotaVideo } from "./use-upload";

// jsdom (usado pelo projeto jsdom do Vitest) não implementa `Blob#arrayBuffer` —
// `enfileirarFoto` lê os bytes do `File` assim, e sem isso todo teste que chama o
// hook de verdade quebraria só por limitação do ambiente, não do código sob teste.
if (!Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function arrayBuffer(this: Blob): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

vi.mock("@/lib/queue", () => ({
  webQueue: {
    enqueue: vi.fn(),
    list: vi.fn(),
    remove: vi.fn(),
    markAttempt: vi.fn(),
    annotate: vi.fn(),
  },
  queueSummary: vi.fn(),
  QueueQuotaExceededError: class QueueQuotaExceededError extends Error {},
}));

vi.mock("@/lib/transport", () => ({
  webTransport: {
    presign: vi.fn(),
    sendBytes: vi.fn(),
    sendPoster: vi.fn(),
    confirm: vi.fn(),
  },
}));

vi.mock("@/lib/drawer", () => ({ webDrawer: {} }));

vi.mock("@/lib/image", () => ({
  deviceDecodes: vi.fn(),
  prepareVideo: vi.fn(),
}));

vi.mock("@/features/guest/lib/report-funnel", () => ({
  reportFunnel: vi.fn(),
}));

// `processarFoto` decodifica bitmap de verdade (canvas) — fora do alcance do jsdom e já coberto
// nos testes do próprio `@albora/core`. O resto do módulo (isHeic/isVideoBytes/drain/...) fica real:
// é o que faz presign→PUT→confirm e a distinção HEIC/vídeo serem exercitados de verdade aqui.
vi.mock("@albora/core", async (importOriginal) => {
  const original = await importOriginal<typeof AlboraCoreNS>();
  return { ...original, processarFoto: vi.fn() };
});

function setOnline(value: boolean) {
  Object.defineProperty(navigator, "onLine", { configurable: true, value });
}

function setVisibilityState(value: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { configurable: true, value });
}

/** Caixa ISO-BMFF (`ftyp` + marca de 4 letras) — o mesmo contêiner que HEIC/MP4/.mov do iPhone usam. */
function bytesFtyp(marca: string, tamanho = 24): Uint8Array {
  const arr = new Uint8Array(tamanho);
  const ftyp = [0x66, 0x74, 0x79, 0x70];
  ftyp.forEach((b, i) => {
    arr[4 + i] = b;
  });
  for (let i = 0; i < 4; i += 1) {
    arr[8 + i] = marca.charCodeAt(i);
  }
  return arr;
}

function arquivoFoto(opts: { lastModified?: number } = {}): File {
  const bytes = new Uint8Array([0xff, 0xd8, 0xff, ...new Array(20).fill(0)]);
  return new File([bytes as BufferSource], "foto.jpg", {
    type: "image/jpeg",
    lastModified: opts.lastModified ?? 1_700_000_000_000,
  });
}

function arquivoHeic(): File {
  const bytes = bytesFtyp("heic");
  return new File([bytes as BufferSource], "foto.heic", {
    type: "image/heic",
    lastModified: 1_700_000_000_000,
  });
}

function arquivoVideo(opts: { nome?: string; tipo?: string } = {}): File {
  const bytes = bytesFtyp("isom", 32);
  return new File([bytes as BufferSource], opts.nome ?? "video.mp4", {
    type: opts.tipo ?? "video/mp4",
    lastModified: 1_700_000_000_000,
  });
}

function fotoProcessada(overrides: Partial<FotoProcessada<Blob>> = {}): FotoProcessada<Blob> {
  return {
    full: new Blob(["full"], { type: "image/jpeg" }),
    thumb: new Blob(["thumb"], { type: "image/jpeg" }),
    largura: 1080,
    altura: 1920,
    orientacaoOriginal: 1,
    tinhaGeolocalizacao: false,
    capturadaEm: null,
    ...overrides,
  };
}

function itemNaFila(id: string, overrides: Partial<QueueItem> = {}): QueueItem {
  return {
    id,
    eventoId: "evt1",
    corpo: { tipo: "arquivo", caminho: `/tmp/${id}`, bytes: 100 },
    mime: "image/jpeg",
    criadoEm: Date.now(),
    tentativas: 0,
    ...overrides,
  };
}

function presignOk(): RespostaPresign {
  return { uploadId: "u1", chave: "k1", full: "https://full", thumb: "https://thumb", expiraEm: Date.now() + 60_000 };
}

const COTA_LIVRE: CotaVideo = { limite: null, enviados: 0 };

function opcoes(cotaVideo: CotaVideo = COTA_LIVRE) {
  return { plano: "free" as const, cotaVideo };
}

describe("useUpload — orquestrador do caminho crítico presign→PUT→confirm", () => {
  beforeEach(() => {
    setOnline(true);
    setVisibilityState("visible");

    vi.mocked(webQueue.enqueue).mockResolvedValue(undefined);
    vi.mocked(webQueue.list).mockResolvedValue([]);
    vi.mocked(webQueue.remove).mockResolvedValue(undefined);
    vi.mocked(webQueue.markAttempt).mockResolvedValue(undefined);
    vi.mocked(webQueue.annotate).mockResolvedValue(true);
    vi.mocked(queueSummary).mockResolvedValue({ itens: 0, bytes: 0 });

    vi.mocked(webTransport.presign).mockResolvedValue(presignOk());
    vi.mocked(webTransport.sendBytes).mockResolvedValue(undefined);
    vi.mocked(webTransport.sendPoster!).mockResolvedValue(undefined);
    vi.mocked(webTransport.confirm).mockResolvedValue(undefined);

    vi.mocked(processarFoto).mockResolvedValue(fotoProcessada());
    vi.mocked(deviceDecodes).mockResolvedValue(true);
    vi.mocked(prepareVideo).mockResolvedValue({ largura: 640, altura: 480, poster: null });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 200 }));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe("caminho feliz — foto", () => {
    it("processa no cliente antes de enfileirar, e o dreno percorre presign → PUT → confirm", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("pendente-1")]);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      let resposta: Awaited<ReturnType<typeof result.current.enfileirarFoto>> | undefined;
      await act(async () => {
        resposta = await result.current.enfileirarFoto({ arquivo: arquivoFoto() });
      });

      expect(resposta?.ok).toBe(true);
      expect(webQueue.enqueue).toHaveBeenCalledTimes(1);

      // EXIF/redimensionamento acontecem no cliente ANTES do item existir na fila.
      const ordemProcessar = vi.mocked(processarFoto).mock.invocationCallOrder[0]!;
      const ordemEnfileirar = vi.mocked(webQueue.enqueue).mock.invocationCallOrder[0]!;
      expect(ordemProcessar).toBeLessThan(ordemEnfileirar);

      await waitFor(() => expect(webTransport.confirm).toHaveBeenCalledTimes(1));

      expect(webTransport.presign).toHaveBeenCalledWith(expect.objectContaining({ id: "pendente-1" }));
      expect(webTransport.sendBytes).toHaveBeenCalledWith(
        "https://full",
        expect.objectContaining({ id: "pendente-1" }),
      );
      expect(webQueue.remove).toHaveBeenCalledWith("pendente-1");

      expect(result.current.estado.ultimoErro).toBeNull();
      expect(result.current.estado.processando).toBe(false);
    });

    it("marca `processando` durante o processamento e libera ao final, mesmo em erro", async () => {
      vi.mocked(processarFoto).mockRejectedValueOnce(new Error("boom"));

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.enfileirarFoto({ arquivo: arquivoFoto() });
      });

      expect(result.current.estado.processando).toBe(false);
      expect(result.current.estado.ultimoErro).toBe("Não consegui preparar essa foto. Tente de novo.");
      expect(webQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("HEIC — decisão fica no aparelho, nunca no `File.type`", () => {
    it("recusa quando o aparelho não decodifica HEIC, sem enfileirar nada", async () => {
      vi.mocked(deviceDecodes).mockResolvedValue(false);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      let resposta: Awaited<ReturnType<typeof result.current.enfileirarFoto>> | undefined;
      await act(async () => {
        resposta = await result.current.enfileirarFoto({ arquivo: arquivoHeic() });
      });

      expect(resposta).toEqual({
        ok: false,
        erro: expect.stringContaining("não abre fotos HEIC"),
      });
      expect(processarFoto).not.toHaveBeenCalled();
      expect(webQueue.enqueue).not.toHaveBeenCalled();
    });

    it("quando o aparelho decodifica, processa com o mime real (image/heic), não com o do File", async () => {
      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.enfileirarFoto({ arquivo: arquivoHeic() });
      });

      expect(processarFoto).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        "image/heic",
        expect.anything(),
        expect.anything(),
      );
      expect(webQueue.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe("vídeo — cota do servidor + contagem local desta sessão", () => {
    it("enfileira o vídeo com o poster gerado como thumb, e soma à cota local", async () => {
      const poster = new Blob(["poster"], { type: "image/jpeg" });
      vi.mocked(prepareVideo).mockResolvedValue({ largura: 640, altura: 480, poster });

      const cota: CotaVideo = { limite: 1, enviados: 0 };
      const { result } = renderHook(() => useUpload("evt1", opcoes(cota)));

      let primeira: Awaited<ReturnType<typeof result.current.enfileirarFoto>> | undefined;
      await act(async () => {
        primeira = await result.current.enfileirarFoto({ arquivo: arquivoVideo() });
      });

      expect(primeira?.ok).toBe(true);
      expect(webQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ mime: "video/mp4", thumb: { tipo: "blob", blob: poster } }),
      );

      // Cota já usada NESTA sessão (servidor ainda não sabe) — a segunda captura de vídeo é recusada.
      let segunda: Awaited<ReturnType<typeof result.current.enfileirarFoto>> | undefined;
      await act(async () => {
        segunda = await result.current.enfileirarFoto({ arquivo: arquivoVideo() });
      });

      expect(segunda).toEqual({
        ok: false,
        erro: mensagemCotaVideo({ limite: 1, enviados: 1 }),
      });
      expect(webQueue.enqueue).toHaveBeenCalledTimes(1);
    });

    it("recusa de saída quando a cota do servidor já está esgotada", async () => {
      const cota: CotaVideo = { limite: 1, enviados: 1 };
      const { result } = renderHook(() => useUpload("evt1", opcoes(cota)));

      let resposta: Awaited<ReturnType<typeof result.current.enfileirarFoto>> | undefined;
      await act(async () => {
        resposta = await result.current.enfileirarFoto({ arquivo: arquivoVideo() });
      });

      expect(resposta).toEqual({ ok: false, erro: mensagemCotaVideo({ limite: 1, enviados: 1 }) });
      expect(webQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  describe("falhas do processamento local", () => {
    it("fila cheia (QueueQuotaExceededError) vira aviso específico, não erro genérico", async () => {
      vi.mocked(webQueue.enqueue).mockRejectedValueOnce(new QueueQuotaExceededError());

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      let resposta: Awaited<ReturnType<typeof result.current.enfileirarFoto>> | undefined;
      await act(async () => {
        resposta = await result.current.enfileirarFoto({ arquivo: arquivoFoto() });
      });

      expect(resposta).toEqual({
        ok: false,
        erro: "Sem espaço no aparelho para guardar a foto. Conecte-se ao WiFi para as pendentes subirem.",
      });
    });
  });

  describe("dreno — falhas em cada etapa do caminho crítico", () => {
    it("falha no presign: não chega ao PUT, item some da fila só depois de esgotar tentativas", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p1")]);
      vi.mocked(webTransport.presign).mockRejectedValue(new Error("presign indisponível"));

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.drenarAgora();
      });

      expect(webTransport.sendBytes).not.toHaveBeenCalled();
      expect(webQueue.markAttempt).toHaveBeenCalledWith("p1");
      expect(webQueue.remove).not.toHaveBeenCalled();
      expect(result.current.estado.ultimoErro).toBe("presign indisponível");
    });

    it("falha no PUT: a foto continua na fila para retry, não some", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p2")]);
      vi.mocked(webTransport.sendBytes).mockRejectedValue(new Error("conexão caiu"));

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.drenarAgora();
      });

      expect(webTransport.presign).toHaveBeenCalled();
      expect(webTransport.confirm).not.toHaveBeenCalled();
      expect(webQueue.markAttempt).toHaveBeenCalledWith("p2");
      expect(webQueue.remove).not.toHaveBeenCalled();
      expect(result.current.estado.ultimoErro).toBe("conexão caiu");
    });

    it("falha no confirm após PUT bem-sucedido: bytes já subiram, mas o item some da fila só quando o confirm aceitar", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p3")]);
      vi.mocked(webTransport.confirm).mockRejectedValue(new Error("confirm recusado"));

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.drenarAgora();
      });

      expect(webTransport.sendBytes).toHaveBeenCalled();
      expect(webQueue.markAttempt).toHaveBeenCalledWith("p3");
      expect(webQueue.remove).not.toHaveBeenCalled();
      expect(result.current.estado.ultimoErro).toBe("confirm recusado");
    });
  });

  describe("offline", () => {
    it("captura offline enfileira sem tentar rede", async () => {
      setOnline(false);
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p4")]);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.enfileirarFoto({ arquivo: arquivoFoto() });
      });

      expect(webQueue.enqueue).toHaveBeenCalledTimes(1);
      expect(webTransport.presign).not.toHaveBeenCalled();
    });

    it("evento `offline` do navegador marca o estado sem tentar drenar", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p4b")]);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));
      await waitFor(() => expect(result.current.estado.online).toBe(true));

      act(() => {
        window.dispatchEvent(new Event("offline"));
      });

      expect(result.current.estado.online).toBe(false);
      expect(webTransport.presign).not.toHaveBeenCalled();
    });

    it("drenarAgora devolve null e não toca a rede quando offline", async () => {
      setOnline(false);
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p5")]);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      let resumo: Awaited<ReturnType<typeof result.current.drenarAgora>> = null;
      await act(async () => {
        resumo = await result.current.drenarAgora();
      });

      expect(resumo).toBeNull();
      expect(webTransport.presign).not.toHaveBeenCalled();
    });
  });

  describe("guarda de reentrância do dreno", () => {
    it("duas chamadas concorrentes a drenarAgora disparam um único presign", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p6")]);

      let liberar!: (v: RespostaPresign) => void;
      vi.mocked(webTransport.presign).mockReturnValue(
        new Promise((resolve) => {
          liberar = resolve;
        }),
      );

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      let p1: ReturnType<typeof result.current.drenarAgora> = Promise.resolve(null);
      let p2: ReturnType<typeof result.current.drenarAgora> = Promise.resolve(null);
      act(() => {
        p1 = result.current.drenarAgora();
        p2 = result.current.drenarAgora();
      });

      await waitFor(() => expect(webTransport.presign).toHaveBeenCalledTimes(1));

      await act(async () => {
        liberar(presignOk());
        await Promise.all([p1, p2]);
      });

      expect(await p2).toBeNull();
      expect((await p1)?.enviados).toBe(1);
    });
  });

  describe("retorno de foco (visibilitychange / pageshow)", () => {
    it("visível e online: drena. visível e offline: só atualiza contagem. invisível: ignora", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p7")]);
      renderHook(() => useUpload("evt1", opcoes()));
      await waitFor(() => expect(queueSummary).toHaveBeenCalled());

      vi.mocked(webTransport.presign).mockClear();
      vi.mocked(queueSummary).mockClear();

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(webTransport.presign).toHaveBeenCalledTimes(1);

      setOnline(false);
      vi.mocked(webTransport.presign).mockClear();
      vi.mocked(queueSummary).mockClear();

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(webTransport.presign).not.toHaveBeenCalled();
      expect(queueSummary).toHaveBeenCalled();

      setOnline(true);
      setVisibilityState("hidden");
      vi.mocked(webTransport.presign).mockClear();
      vi.mocked(queueSummary).mockClear();

      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(webTransport.presign).not.toHaveBeenCalled();
      expect(queueSummary).not.toHaveBeenCalled();
    });

    it("pageshow com persisted=true age como retorno de foco; persisted=false não faz nada", async () => {
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p8")]);
      renderHook(() => useUpload("evt1", opcoes()));
      await waitFor(() => expect(queueSummary).toHaveBeenCalled());

      vi.mocked(webTransport.presign).mockClear();

      await act(async () => {
        window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: false }));
      });
      expect(webTransport.presign).not.toHaveBeenCalled();

      await act(async () => {
        window.dispatchEvent(Object.assign(new Event("pageshow"), { persisted: true }));
      });
      expect(webTransport.presign).toHaveBeenCalledTimes(1);
    });

    it("religar a rede (evento `online`) dispara dreno automaticamente", async () => {
      setOnline(false);
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p9")]);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));
      await waitFor(() => expect(result.current.estado.online).toBe(false));

      await act(async () => {
        setOnline(true);
        window.dispatchEvent(new Event("online"));
      });

      expect(result.current.estado.online).toBe(true);
      expect(webTransport.presign).toHaveBeenCalledTimes(1);
    });

    it("a cada 30s tenta drenar de novo; para de tentar após o unmount", async () => {
      vi.useFakeTimers();
      vi.mocked(webQueue.list).mockResolvedValue([itemNaFila("p10")]);

      const { unmount } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      const chamadasNoMount = vi.mocked(webTransport.presign).mock.calls.length;

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30_000);
      });
      expect(vi.mocked(webTransport.presign).mock.calls.length).toBeGreaterThan(chamadasNoMount);

      unmount();
      const chamadasNoUnmount = vi.mocked(webTransport.presign).mock.calls.length;

      await vi.advanceTimersByTimeAsync(90_000);
      expect(vi.mocked(webTransport.presign).mock.calls.length).toBe(chamadasNoUnmount);
    });
  });

  describe("cleanup no unmount", () => {
    it("remove EXATAMENTE os listeners registrados no mount (mesma referência, não `expect.any(Function)`)", async () => {
      const addWindow = vi.spyOn(window, "addEventListener");
      const removeWindow = vi.spyOn(window, "removeEventListener");
      const addDoc = vi.spyOn(document, "addEventListener");
      const removeDoc = vi.spyOn(document, "removeEventListener");
      const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
      const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

      const { unmount } = renderHook(() => useUpload("evt1", opcoes()));
      await waitFor(() => expect(queueSummary).toHaveBeenCalled());

      // Referência real passada ao addEventListener/setInterval no mount —
      // `expect.any(Function)` aceitaria uma closure NOVA no cleanup e
      // deixaria o handler antigo pendurado sem o teste perceber (achado A3
      // do review de gates).
      const registrado = (spy: typeof addWindow, tipo: string) =>
        spy.mock.calls.find(([evento]) => evento === tipo)?.[1];
      const online = registrado(addWindow, "online");
      const offline = registrado(addWindow, "offline");
      const pageshow = registrado(addWindow, "pageshow");
      const visibilitychange = registrado(addDoc, "visibilitychange");
      const relogio = setIntervalSpy.mock.results[0]?.value;

      unmount();

      expect(removeWindow).toHaveBeenCalledWith("online", online);
      expect(removeWindow).toHaveBeenCalledWith("offline", offline);
      expect(removeWindow).toHaveBeenCalledWith("pageshow", pageshow);
      expect(removeDoc).toHaveBeenCalledWith("visibilitychange", visibilitychange);
      expect(clearIntervalSpy).toHaveBeenCalledWith(relogio);
    });
  });

  describe("metadados da captura e da rede", () => {
    it("EXIF de parede vira `capturadaEmParede: true` no item da fila", async () => {
      const paredeExif = new Date(1_690_000_000_000);
      vi.mocked(processarFoto).mockResolvedValue(fotoProcessada({ capturadaEm: paredeExif }));

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.enfileirarFoto({ arquivo: arquivoFoto() });
      });

      expect(webQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ capturadaEm: paredeExif.getTime(), capturadaEmParede: true }),
      );
    });

    it("sem EXIF e sem `lastModified` válido, o item guarda só as dimensões", async () => {
      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.enfileirarFoto({ arquivo: arquivoFoto({ lastModified: 0 }) });
      });

      const chamada = vi.mocked(webQueue.enqueue).mock.calls[0]?.[0];
      expect(chamada).toBeDefined();
      expect(chamada).not.toHaveProperty("capturadaEm");
      expect(chamada).not.toHaveProperty("capturadaEmParede");
      expect(chamada).toMatchObject({ largura: 1080, altura: 1920 });
    });

    it("reduz o plano de processamento quando a Network Information API está presente", async () => {
      Object.defineProperty(navigator, "connection", {
        configurable: true,
        value: { saveData: true, effectiveType: "3g" },
      });

      try {
        const { result } = renderHook(() => useUpload("evt1", opcoes()));

        await act(async () => {
          await result.current.enfileirarFoto({ arquivo: arquivoFoto() });
        });

        expect(processarFoto).toHaveBeenCalledWith(
          expect.any(Uint8Array),
          expect.anything(),
          expect.anything(),
          expect.objectContaining({ rede: { economiaDeDados: true, tipoEfetivo: "3g" } }),
        );
      } finally {
        Reflect.deleteProperty(navigator, "connection");
      }
    });

    it("vídeo .mov ou `video/quicktime` sobe com o mime correto", async () => {
      const { result: r1 } = renderHook(() => useUpload("evt1", opcoes()));
      await act(async () => {
        await r1.current.enfileirarFoto({ arquivo: arquivoVideo({ nome: "clipe.mov" }) });
      });
      expect(webQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ mime: "video/quicktime" }),
      );

      vi.mocked(webQueue.enqueue).mockClear();

      const { result: r2 } = renderHook(() => useUpload("evt1", opcoes()));
      await act(async () => {
        await r2.current.enfileirarFoto({
          arquivo: arquivoVideo({ nome: "clipe.mp4", tipo: "video/quicktime" }),
        });
      });
      expect(webQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ mime: "video/quicktime" }),
      );
    });
  });

  describe("mensagemCotaVideo — avisos de cota de vídeo (função pura)", () => {
    it("sem limite não produz mensagem", () => {
      expect(mensagemCotaVideo({ limite: null, enviados: 99 })).toBeNull();
    });

    it("plano com limite único avisa antes de chegar a zero", () => {
      expect(mensagemCotaVideo({ limite: 1, enviados: 0 })).toMatch(/1 vídeo por convidado/);
    });

    it("plano com múltiplos vídeos informa o limite", () => {
      expect(mensagemCotaVideo({ limite: 3, enviados: 0 })).toMatch(/3 vídeos/);
    });
  });

  describe("anotar — legenda/lugar escritos durante o upload", () => {
    it("quando a fila ainda tem o item, anota nela e não chama o servidor", async () => {
      vi.mocked(webQueue.annotate).mockResolvedValue(true);
      const fetchSpy = vi.mocked(fetch);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.anotar("id-1", { legenda: "oi" });
      });

      expect(webQueue.annotate).toHaveBeenCalledWith("id-1", { legenda: "oi" });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("quando o item já saiu da fila, cai para o endpoint do servidor", async () => {
      vi.mocked(webQueue.annotate).mockResolvedValue(false);

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await act(async () => {
        await result.current.anotar("id-2", { legenda: "oi" });
      });

      expect(fetch).toHaveBeenCalledWith(
        "/api/uploads/detalhes",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ uploadId: "id-2", legenda: "oi" }),
        }),
      );
    });

    it("falha silenciosa: foto já está salva, legenda opcional não pode derrubar a tela", async () => {
      vi.mocked(webQueue.annotate).mockRejectedValue(new Error("indisponível"));

      const { result } = renderHook(() => useUpload("evt1", opcoes()));

      await expect(
        act(async () => {
          await result.current.anotar("id-3", { legenda: "oi" });
        }),
      ).resolves.not.toThrow();
    });
  });
});
