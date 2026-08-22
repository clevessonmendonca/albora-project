import { describe, expect, it, vi } from "vitest";
import {
  carregarMinhasFotos,
  deletarFotoEnviada,
  fetchMinhasDoServidor,
  itemDaFilaParaFoto,
} from "./my-photos";
import type { GuestSession } from "./session";
import { createFileQueue, memoryStore } from "./queue";
import type { QueueItem } from "@albora/core";
import { MAX_ATTEMPTS } from "@albora/core";

const sessao: GuestSession = {
  token: "tok.x",
  slug: "festa-demo",
  sessaoId: "sess-1",
  eventoId: "ev-1",
};

function queueItem(over: Partial<QueueItem> = {}): QueueItem {
  return {
    id: "local-1",
    eventoId: "ev-1",
    corpo: { tipo: "arquivo", caminho: "/tmp/a.jpg", bytes: 10 },
    mime: "image/jpeg",
    criadoEm: Date.now(),
    tentativas: 0,
    ...over,
  };
}

function mockFetch(body: unknown, status = 200): typeof fetch {
  return vi.fn().mockImplementation((url: string | URL | Request) => {
    const urlStr = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    if (urlStr.includes("/api/media/urls")) {
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ urls: [] }) });
    }
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body),
    });
  }) as unknown as typeof fetch;
}

describe("fetchMinhasDoServidor", () => {
  it("devolve lista vazia quando o servidor retorna enviadas: []", async () => {
    const fetchFn = mockFetch({ interacao: "espelho", enviadas: [] });
    const resultado = await fetchMinhasDoServidor(sessao, fetchFn);
    expect(resultado.interacao).toBe("espelho");
    expect(resultado.enviadas).toHaveLength(0);
  });

  it("mapeia fotos do servidor com tipo: enviada", async () => {
    const fetchFn = mockFetch({
      interacao: "completo",
      enviadas: [
        {
          id: "foto-1",
          chaveThumb: "events/ev-1/thumb.jpg",
          chaveFull: "events/ev-1/full.jpg",
          mime: "image/jpeg",
          criadaEm: new Date().toISOString(),
          autor: "Ana",
        },
      ],
    });
    const resultado = await fetchMinhasDoServidor(sessao, fetchFn);
    expect(resultado.enviadas[0]?.tipo).toBe("enviada");
    expect(resultado.enviadas[0]?.autor).toBe("Ana");
  });

  it("usa 'espelho' como interacao padrão quando o campo vem ausente", async () => {
    const fetchFn = mockFetch({ enviadas: [] });
    const resultado = await fetchMinhasDoServidor(sessao, fetchFn);
    expect(resultado.interacao).toBe("espelho");
  });

  it("lança erro quando o servidor retorna status não OK", async () => {
    const fetchFn = mockFetch({}, 401);
    await expect(fetchMinhasDoServidor(sessao, fetchFn)).rejects.toThrow("my-photos 401");
  });
});

describe("itemDaFilaParaFoto", () => {
  it("item com tentativas < MAX_ATTEMPTS → pendente", () => {
    const item = queueItem({ tentativas: 0 });
    const foto = itemDaFilaParaFoto(item);
    expect(foto.tipo).toBe("pendente");
  });

  it("item com tentativas == MAX_ATTEMPTS → falhou", () => {
    const item = queueItem({ tentativas: MAX_ATTEMPTS });
    const foto = itemDaFilaParaFoto(item);
    expect(foto.tipo).toBe("falhou");
  });

  it("item pendente preserva tentativas", () => {
    const item = queueItem({ tentativas: 3 });
    const foto = itemDaFilaParaFoto(item);
    expect(foto.tipo).toBe("pendente");
    if (foto.tipo === "pendente") {
      expect(foto.tentativas).toBe(3);
    }
  });
});

describe("carregarMinhasFotos", () => {
  it("sem itens na fila e servidor vazio → fotos []", async () => {
    const fetchFn = mockFetch({ interacao: "espelho", enviadas: [] });
    const queue = createFileQueue(memoryStore(), "fila");
    const resultado = await carregarMinhasFotos(sessao, queue, fetchFn);
    expect(resultado.fotos).toHaveLength(0);
    expect(resultado.interacao).toBe("espelho");
  });

  it("itens da fila aparecem antes das enviadas do servidor", async () => {
    const fetchFn = mockFetch({
      interacao: "espelho",
      enviadas: [
        {
          id: "foto-srv",
          chaveThumb: "events/ev-1/t.jpg",
          chaveFull: "events/ev-1/f.jpg",
          mime: "image/jpeg",
          criadaEm: new Date().toISOString(),
          autor: "Bob",
        },
      ],
    });
    const queue = createFileQueue(memoryStore(), "fila");
    await queue.enqueue(queueItem({ id: "local-1", tentativas: 0 }));

    const resultado = await carregarMinhasFotos(sessao, queue, fetchFn);
    expect(resultado.fotos).toHaveLength(2);
    expect(resultado.fotos[0]?.tipo).toBe("pendente");
    expect(resultado.fotos[1]?.tipo).toBe("enviada");
  });

  it("item da fila com mesmo id que o servidor é excluído da lista local", async () => {
    const id = "shared-id";
    const fetchFn = mockFetch({
      interacao: "espelho",
      enviadas: [
        {
          id,
          chaveThumb: "events/ev-1/t.jpg",
          chaveFull: "events/ev-1/f.jpg",
          mime: "image/jpeg",
          criadaEm: new Date().toISOString(),
          autor: "Carlos",
        },
      ],
    });
    const queue = createFileQueue(memoryStore(), "fila");
    await queue.enqueue(queueItem({ id, tentativas: 1 }));

    const resultado = await carregarMinhasFotos(sessao, queue, fetchFn);
    // Deve aparecer apenas como "enviada" (servidor), não como "pendente" também
    expect(resultado.fotos).toHaveLength(1);
    expect(resultado.fotos[0]?.tipo).toBe("enviada");
  });

  it("fila com item falho aparece no resultado com tipo falhou", async () => {
    const fetchFn = mockFetch({ interacao: "espelho", enviadas: [] });
    const queue = createFileQueue(memoryStore(), "fila");
    await queue.enqueue(queueItem({ id: "fail-1", tentativas: MAX_ATTEMPTS }));

    const resultado = await carregarMinhasFotos(sessao, queue, fetchFn);
    expect(resultado.fotos).toHaveLength(1);
    expect(resultado.fotos[0]?.tipo).toBe("falhou");
  });
});

describe("deletarFotoEnviada", () => {
  it("retorna ok:true quando o servidor responde 200", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
    const resultado = await deletarFotoEnviada(sessao, "foto-1", fetchFn);
    expect(resultado.ok).toBe(true);
  });

  it("retorna ok:false quando o servidor responde 403", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: false, status: 403 }) as unknown as typeof fetch;
    const resultado = await deletarFotoEnviada(sessao, "foto-1", fetchFn);
    expect(resultado.ok).toBe(false);
  });

  it("chama DELETE /api/uploads com o uploadId correto", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;
    await deletarFotoEnviada(sessao, "foto-xyz", fetchFn);
    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, opts] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/api/uploads");
    expect(opts.method).toBe("DELETE");
    expect(JSON.parse(opts.body as string)).toEqual({ uploadId: "foto-xyz" });
  });

  it("envia o cookie de sessão no cabeçalho", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true }) as unknown as typeof fetch;
    await deletarFotoEnviada(sessao, "foto-abc", fetchFn);
    const [, opts] = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["cookie"]).toContain("tok.x");
  });
});
