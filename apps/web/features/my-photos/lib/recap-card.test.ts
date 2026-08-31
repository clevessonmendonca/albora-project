import { afterEach, describe, expect, it, vi } from "vitest";
import { buscarRecapPessoal } from "./recap-card";

describe("buscarRecapPessoal — GET /api/guests/me/recap", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devolve fotos e curtidas quando a rota responde ok", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ fotos: 12, curtidas: 34 }), { status: 200 })),
    );

    expect(await buscarRecapPessoal()).toEqual({ fotos: 12, curtidas: 34 });
    expect(fetch).toHaveBeenCalledWith("/api/guests/me/recap", { credentials: "same-origin" });
  });

  it("sessão inválida (401) degrada para null, nunca lança", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("não", { status: 401 })));
    expect(await buscarRecapPessoal()).toBeNull();
  });

  it("erro do servidor (500) degrada para null", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("não", { status: 500 })));
    expect(await buscarRecapPessoal()).toBeNull();
  });

  it("corpo com formato inesperado degrada para null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ fotos: "12" }), { status: 200 })),
    );
    expect(await buscarRecapPessoal()).toBeNull();
  });

  it("rede fora do ar (fetch lança) degrada para null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    expect(await buscarRecapPessoal()).toBeNull();
  });
});
