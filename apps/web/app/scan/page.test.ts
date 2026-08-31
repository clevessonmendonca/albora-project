import { afterEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn((_url: string) => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import GuestScanPage from "./page";

/** `?codigo=` é o link de WhatsApp (spec §4.5): autoenvia sem confirmar, mesmo que `/{slug}`; `via=code` porque não passou pela câmera. */
describe("GuestScanPage — ?codigo= autoenvia à prova de tia", () => {
  afterEach(() => {
    redirectMock.mockClear();
  });

  it("código impresso na URL entra direto no evento — via=code", async () => {
    await expect(
      GuestScanPage({ searchParams: Promise.resolve({ codigo: "anaejoao" }) }),
    ).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/e/anaejoao?via=code");
  });

  it("link completo colado em ?codigo= também extrai o slug e autoenvia", async () => {
    await expect(
      GuestScanPage({
        searchParams: Promise.resolve({ codigo: "https://albora.app/e/anaejoao" }),
      }),
    ).rejects.toThrow();

    expect(redirectMock).toHaveBeenCalledWith("/e/anaejoao?via=code");
  });

  it("código com formato inválido não redireciona — cai no scanner pra corrigir", async () => {
    await GuestScanPage({ searchParams: Promise.resolve({ codigo: "  " }) });

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("sem ?codigo= é o scanner normal, sem redirecionar", async () => {
    await GuestScanPage({ searchParams: Promise.resolve({}) });

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
