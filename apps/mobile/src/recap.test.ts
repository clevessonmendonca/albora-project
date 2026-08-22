import { describe, expect, it, vi } from "vitest";
import { buscarRecapPessoal, textoRecap } from "./recap";
import type { GuestSession } from "./session";

const session: GuestSession = {
  token: "t.ok",
  slug: "festa-demo",
  sessaoId: "11111111-1111-1111-1111-111111111111",
  eventoId: "22222222-2222-2222-2222-222222222222",
};

describe("textoRecap", () => {
  it("null sem fotos", () => {
    expect(textoRecap({ fotos: 0, curtidas: 3 })).toBeNull();
  });

  it("singular sem curtida", () => {
    expect(textoRecap({ fotos: 1, curtidas: 0 })).toBe("Você mandou 1 foto");
  });

  it("plural com curtidas", () => {
    expect(textoRecap({ fotos: 3, curtidas: 2 })).toBe("Você mandou 3 fotos · curtida 2 vezes");
  });
});

describe("buscarRecapPessoal", () => {
  it("parseia payload válido", async () => {
    const fetchFn = vi.fn(async () => Response.json({ fotos: 4, curtidas: 7 }));
    expect(await buscarRecapPessoal(session, fetchFn)).toEqual({ fotos: 4, curtidas: 7 });
  });

  it("null em 401", async () => {
    const fetchFn = vi.fn(async () => new Response("no", { status: 401 }));
    expect(await buscarRecapPessoal(session, fetchFn)).toBeNull();
  });

  it("null em corpo inválido", async () => {
    const fetchFn = vi.fn(async () => Response.json({ fotos: "x" }));
    expect(await buscarRecapPessoal(session, fetchFn)).toBeNull();
  });
});
