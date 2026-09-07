import { PACKS } from "@albora/packs";
import { describe, expect, it } from "vitest";
import { identityToFrame } from "./frame-identity";

describe("identityToFrame", () => {
  it("usa tokens do evento quando presentes", () => {
    const pack = PACKS.casamento;
    const identidade = identityToFrame(
      "ana-e-joao",
      new Date("2026-08-12T20:00:00Z"),
      { texto: { monograma: "A♥J", titulo: "Ana e João" } },
      pack,
    );

    expect(identidade.monograma).toBe("A♥J");
    expect(identidade.titulo).toBe("Ana e João");
    expect(identidade.data).toContain("2026");
    expect(identidade.slug).toBe("ana-e-joao");
  });

  it("cai no pack quando tokens do evento estão vazios", () => {
    const pack = PACKS.casamento;
    const identidade = identityToFrame(
      "festa-demo",
      new Date("2026-08-12T20:00:00Z"),
      {},
      pack,
    );

    expect(identidade.monograma.length).toBeGreaterThan(0);
    expect(identidade.titulo.length).toBeGreaterThan(0);
  });
});
