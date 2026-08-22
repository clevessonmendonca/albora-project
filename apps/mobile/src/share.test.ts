import { describe, expect, it, vi } from "vitest";

vi.mock("expo-file-system", () => ({
  cacheDirectory: "/tmp/",
  downloadAsync: vi.fn(),
}));
vi.mock("expo-sharing", () => ({
  isAvailableAsync: vi.fn(async () => true),
  shareAsync: vi.fn(async () => undefined),
}));

import { fetchShareContext, registrarConsentimentoExterno } from "./share";
import type { GuestSession } from "./session";

const session: GuestSession = {
  token: "t.ok",
  slug: "festa-demo",
  sessaoId: "11111111-1111-1111-1111-111111111111",
  eventoId: "22222222-2222-2222-2222-222222222222",
};

describe("fetchShareContext", () => {
  it("parseia contexto válido", async () => {
    const fetchFn = vi.fn(async () =>
      Response.json({
        chaveFull: "e/x/full",
        mime: "image/jpeg",
        evento: { compartilhamentoExternoLiberado: true, panico: false },
        sessao: { consentimentoExterno: null },
        midia: { removida: false },
      }),
    );
    const ctx = await fetchShareContext(session, "33333333-3333-3333-3333-333333333333", fetchFn);
    expect(ctx?.chaveFull).toBe("e/x/full");
  });

  it("retorna null em 404", async () => {
    const fetchFn = vi.fn(async () => new Response("no", { status: 404 }));
    expect(await fetchShareContext(session, "33333333-3333-3333-3333-333333333333", fetchFn)).toBeNull();
  });
});

describe("registrarConsentimentoExterno", () => {
  it("true em 200", async () => {
    const fetchFn = vi.fn(async () => Response.json({ registrado: true }));
    expect(await registrarConsentimentoExterno(session, true, fetchFn)).toBe(true);
  });
});
