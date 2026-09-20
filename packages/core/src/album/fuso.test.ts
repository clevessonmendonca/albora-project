import { describe, expect, it } from "vitest";
import {
  FUSO_PADRAO,
  fusoIanaValido,
  fusoOuPadrao,
  offsetMinutosDoFuso,
  instanteLocalNoFuso,
} from "./fuso";

describe("fusoIanaValido", () => {
  it("aceita fusos IANA válidos", () => {
    expect(fusoIanaValido("America/Sao_Paulo")).toBe(true);
    expect(fusoIanaValido("America/Manaus")).toBe(true);
    expect(fusoIanaValido("UTC")).toBe(true);
  });

  it("rejeita fusos inválidos", () => {
    expect(fusoIanaValido("")).toBe(false);
    expect(fusoIanaValido("XY")).toBe(false);
    expect(fusoIanaValido("Foo/Bar/Baz/Qux/Quux/Corge/Grault/Garply/Waldo/Fred/Plugh/Xyzzy/Thud/Extra")).toBe(false);
  });

  it("rejeita tipos errados em runtime", () => {
    expect(fusoIanaValido(null as unknown as string)).toBe(false);
    expect(fusoIanaValido(42 as unknown as string)).toBe(false);
  });
});

describe("fusoOuPadrao", () => {
  it("retorna o fuso quando válido", () => {
    expect(fusoOuPadrao("America/Manaus")).toBe("America/Manaus");
  });

  it("retorna FUSO_PADRAO para null/undefined/inválido", () => {
    expect(fusoOuPadrao(null)).toBe(FUSO_PADRAO);
    expect(fusoOuPadrao(undefined)).toBe(FUSO_PADRAO);
    expect(fusoOuPadrao("invalido")).toBe(FUSO_PADRAO);
  });
});

describe("offsetMinutosDoFuso", () => {
  it("retorna offset negativo para fusos oeste de Greenwich", () => {
    const offset = offsetMinutosDoFuso("America/Sao_Paulo", new Date("2026-06-15T12:00:00Z"));
    expect(offset).toBe(-180);
  });

  it("retorna 0 para UTC", () => {
    expect(offsetMinutosDoFuso("UTC", new Date("2026-06-15T12:00:00Z"))).toBe(0);
  });

  it("retorna offset correto para Manaus (-4h)", () => {
    const offset = offsetMinutosDoFuso("America/Manaus", new Date("2026-06-15T12:00:00Z"));
    expect(offset).toBe(-240);
  });
});

describe("instanteLocalNoFuso", () => {
  it("converte datetime-local (parede) no instante UTC correto", () => {
    const resultado = instanteLocalNoFuso("2026-09-01T20:00", "America/Sao_Paulo");
    expect(resultado).not.toBeNull();
    expect(resultado!.toISOString()).toBe("2026-09-01T23:00:00.000Z");
  });

  it("mantém ISO com Z como absoluto", () => {
    const resultado = instanteLocalNoFuso("2026-09-01T23:00:00Z", "America/Sao_Paulo");
    expect(resultado).not.toBeNull();
    expect(resultado!.toISOString()).toBe("2026-09-01T23:00:00.000Z");
  });

  it("retorna null para data inválida", () => {
    expect(instanteLocalNoFuso("abc", "America/Sao_Paulo")).toBeNull();
  });

  it("aceita datetime-local com segundos", () => {
    const resultado = instanteLocalNoFuso("2026-09-01T20:00:30", "America/Sao_Paulo");
    expect(resultado).not.toBeNull();
    expect(resultado!.getUTCSeconds()).toBe(30);
  });
});
