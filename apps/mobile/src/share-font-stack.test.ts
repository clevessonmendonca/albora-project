import { describe, expect, it } from "vitest";
import { primeiraFamiliaFonte } from "./share-font-stack";

describe("primeiraFamiliaFonte", () => {
  it("pega Fraunces da stack da marca", () => {
    expect(primeiraFamiliaFonte("Fraunces, Georgia, serif")).toBe("Fraunces");
  });

  it("remove aspas", () => {
    expect(primeiraFamiliaFonte('"Instrument Sans", sans-serif')).toBe("Instrument Sans");
  });

  it("var() cai no System", () => {
    expect(primeiraFamiliaFonte("var(--fonte-corpo)")).toBe("System");
  });
});
