import { describe, expect, it } from "vitest";
import { cleanCaption, acceptedPlace, acceptedTakenAt, acceptedTakenAtInTimeZone, acceptedSize, MAX_CAPTION } from "./details";

describe("legenda", () => {
  it("passa texto normal", () => {
    expect(cleanCaption("  a mesa toda de pé  ")).toBe("a mesa toda de pé");
  });

  it("vazio e espaço viram null, não string vazia", () => {
    // `null` é o sinal de "não mexe": o COALESCE preserva o que já estava lá.
    expect(cleanCaption("   ")).toBeNull();
    expect(cleanCaption("")).toBeNull();
    expect(cleanCaption(undefined)).toBeNull();
    expect(cleanCaption(42)).toBeNull();
  });

  it("corta no limite", () => {
    expect(cleanCaption("a".repeat(400))).toHaveLength(MAX_CAPTION);
  });

  it("tira caractere de controle e de formatação", () => {
    // Vai para o telão — um override de direção projetado numa parede inverte a linha na frente de 150 pessoas.
    expect(cleanCaption("linha um‮dois")).toBe("linha um dois");
    expect(cleanCaption("quebra\u0000nula")).toBe("quebra nula");
  });
});

describe("lugar", () => {
  it("aceita o que está no pack do evento", () => {
    expect(acceptedPlace("casamento", "altar")).toBe("altar");
  });

  it("recusa o que não está naquele pack", () => {
    expect(acceptedPlace("quinze-anos", "altar")).toBeNull();
    expect(acceptedPlace("casamento", "sala-do-servidor")).toBeNull();
  });

  it("recusa coordenada — GPS não volta pela porta da frente", () => {
    expect(acceptedPlace("casamento", "-22.9068,-43.1729")).toBeNull();
  });

  it("pack desconhecido não aceita nada", () => {
    expect(acceptedPlace("pack-que-saiu-do-catalogo", "pista")).toBeNull();
    expect(acceptedPlace(null, "pista")).toBeNull();
  });
});

describe("instante e dimensões no confirm", () => {
  it("aceita ISO real e recusa lixo", () => {
    expect(acceptedTakenAt("2026-08-09T01:10:00.000Z")?.toISOString()).toBe(
      "2026-08-09T01:10:00.000Z",
    );
    expect(acceptedTakenAt("ontem")).toBeNull();
    expect(acceptedTakenAt("1899-01-01T00:00:00.000Z")).toBeNull();
    expect(acceptedTakenAt(1)).toBeNull();
  });

  it("a parede do EXIF vira instante no fuso do evento, não no de Brasília", () => {
    expect(
      acceptedTakenAtInTimeZone("2026-08-08T21:00:00.000Z", "Pacific/Honolulu")?.toISOString(),
    ).toBe("2026-08-09T07:00:00.000Z");
    expect(
      acceptedTakenAtInTimeZone("2026-08-08T21:00:00.000Z", "America/Sao_Paulo")?.toISOString(),
    ).toBe("2026-08-09T00:00:00.000Z");
  });

  it("só aceita o par de dimensões, nunca um lado só", () => {
    expect(acceptedSize(1080, 1920)).toEqual({ width: 1080, height: 1920 });
    expect(acceptedSize(1080, null)).toBeNull();
    expect(acceptedSize(0, 1920)).toBeNull();
    expect(acceptedSize(1080.5, 1920)).toBeNull();
    expect(acceptedSize(30_000, 1920)).toBeNull();
  });
});
