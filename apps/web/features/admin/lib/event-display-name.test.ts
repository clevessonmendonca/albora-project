import { describe, expect, it } from "vitest";
import { adminEventDisplayName } from "./event-display-name";

describe("adminEventDisplayName", () => {
  it("retorna title quando presente e não-vazio", () => {
    expect(
      adminEventDisplayName({ packId: "casamento", slug: "meu-slug", title: "Festa da Ana" }),
    ).toBe("Festa da Ana");
  });

  it("faz trim do title", () => {
    expect(
      adminEventDisplayName({ packId: "casamento", slug: "slug", title: "  Festa  " }),
    ).toBe("Festa");
  });

  it("resolve via pack quando title está vazio", () => {
    const nome = adminEventDisplayName({ packId: "casamento", slug: "slug", title: "" });
    expect(nome).toBeTruthy();
    expect(nome).not.toBe("slug");
  });

  it("resolve via pack quando title é null", () => {
    const nome = adminEventDisplayName({ packId: "casamento", slug: "slug", title: null });
    expect(nome).toBeTruthy();
  });

  it("resolve via pack quando title é undefined", () => {
    const nome = adminEventDisplayName({ packId: "casamento", slug: "slug" });
    expect(nome).toBeTruthy();
  });

  it("fallback para slug quando pack desconhecido e sem title", () => {
    expect(
      adminEventDisplayName({ packId: "desconhecido", slug: "meu-slug", title: null }),
    ).toBe("meu-slug");
  });
});
