import { afterEach, describe, expect, it, vi } from "vitest";
import {
  desconectarDrive,
  estadoInicialDrive,
  exportarParaDrive,
  gigabytes,
  lerJobDrive,
  lerStatusDrive,
  pedirReauthDrive,
  tokenDoLinkDrive,
  urlDeConectar,
} from "./use-host-drive-export";

describe("exportar para o Drive no painel", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("nasce carregando", () => {
    expect(estadoInicialDrive()).toEqual({ fase: "carregando" });
  });

  it("lerStatusDrive devolve conexão e o gate de tempo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              conexao: { status: "conectado", email: "a@b.com", conectadoEm: "2026-01-01T00:00:00Z" },
              podeExportar: true,
            }),
            { status: 200 },
          ),
      ),
    );

    const r = await lerStatusDrive("evt");
    expect(r).toEqual({
      ok: true,
      status: {
        conexao: { status: "conectado", email: "a@b.com", conectadoEm: "2026-01-01T00:00:00Z" },
        podeExportar: true,
      },
    });
    expect(fetch).toHaveBeenCalledWith("/api/admin/events/evt/drive", { credentials: "same-origin" });
  });

  it("lerStatusDrive trata falha de rede sem estourar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("rede caiu");
      }),
    );
    expect(await lerStatusDrive("evt")).toEqual({ ok: false });
  });

  it("lerJobDrive lê o job mais recente do destino drive", async () => {
    const job = {
      id: "j1",
      estado: "pronto" as const,
      fotos: 3,
      enviadas: 3,
      bytesTotal: 3000,
      bytesEnviados: 3000,
      abrirNoDrive: "https://drive.google.com/drive/folders/x",
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ job }), { status: 200 })));

    const r = await lerJobDrive("evt");
    expect(r).toEqual({ ok: true, job });
  });

  it("pedirReauthDrive chama a rota de reauth do drive, não a do ZIP", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ enviado: true, link: "http://x/a?driveConectar=tok" }), { status: 200 })),
    );

    const r = await pedirReauthDrive("evt");
    expect(r).toEqual({ ok: true, link: "http://x/a?driveConectar=tok" });
    expect(fetch).toHaveBeenCalledWith("/api/admin/events/evt/drive/reauth", {
      method: "POST",
      credentials: "same-origin",
    });
  });

  it("tokenDoLinkDrive lê ?driveConectar=, nunca ?exportar= do fluxo do ZIP", () => {
    expect(tokenDoLinkDrive("http://localhost/admin/e/x/album?driveConectar=abc")).toBe("abc");
    expect(tokenDoLinkDrive("http://localhost/admin/e/x/album?exportar=abc")).toBeNull();
    expect(tokenDoLinkDrive("nao-e-url")).toBeNull();
  });

  it("urlDeConectar aponta pra rota de connect com a confirmação na query — nunca com o nome 'token'", () => {
    expect(urlDeConectar("evt", "tok-123")).toBe("/api/admin/events/evt/drive/connect?confirmacao=tok-123");
  });

  it("exportarParaDrive devolve o job quando dá certo", async () => {
    const job = {
      id: "j1",
      estado: "pronto" as const,
      fotos: 2,
      enviadas: 2,
      bytesTotal: 2000,
      bytesEnviados: 2000,
      abrirNoDrive: "https://drive.google.com/drive/folders/y",
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ job }), { status: 202 })),
    );

    expect(await exportarParaDrive("evt")).toEqual({ ok: true, job });
    expect(fetch).toHaveBeenCalledWith("/api/admin/events/evt/export/drive", {
      method: "POST",
      credentials: "same-origin",
    });
  });

  it("exportarParaDrive traduz 409 de quota insuficiente com os números do erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              code: "drive.quota_insuficiente",
              message: "sem espaço",
              details: { necessario: 5_000_000_000, disponivel: 1_000_000_000 },
            }),
            { status: 409 },
          ),
      ),
    );

    expect(await exportarParaDrive("evt")).toEqual({
      ok: false,
      code: "quota_insuficiente",
      necessario: 5_000_000_000,
      disponivel: 1_000_000_000,
    });
  });

  it("exportarParaDrive propaga outros códigos de erro sem inventar texto", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ code: "drive.nao_conectado" }), { status: 409 })),
    );
    expect(await exportarParaDrive("evt")).toEqual({ ok: false, code: "drive.nao_conectado" });
  });

  it("desconectarDrive chama DELETE e devolve booleano", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 200 })));
    expect(await desconectarDrive("evt")).toBe(true);
    expect(fetch).toHaveBeenCalledWith("/api/admin/events/evt/drive", {
      method: "DELETE",
      credentials: "same-origin",
    });
  });

  it("gigabytes formata bytes com uma casa decimal", () => {
    expect(gigabytes(1_073_741_824)).toBe("1.0");
    expect(gigabytes(1_610_612_736)).toBe("1.5");
    expect(gigabytes(0)).toBe("0.0");
  });
});
