import { PACKS } from "@albora/packs";
import { describe, expect, it } from "vitest";
import { identidadeParaMoldura } from "./identidade-moldura";

describe("identidadeParaMoldura", () => {
  it("usa tokens do evento quando presentes", () => {
    const pack = PACKS.casamento;
    const identidade = identidadeParaMoldura(
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
    const identidade = identidadeParaMoldura(
      "festa-demo",
      new Date("2026-08-12T20:00:00Z"),
      {},
      pack,
    );

    expect(identidade.monograma.length).toBeGreaterThan(0);
    expect(identidade.titulo.length).toBeGreaterThan(0);
  });
});
