import { describe, expect, it } from "vitest";
import {
  NOME_NEUTRO_DO_TELAO,
  nomeNeutroDoTelao,
  validarNomeDeExibicao,
} from "./nome-exibicao";

describe("nome neutro no telão", () => {
  it("reduz a primeira letra e um ponto médio", () => {
    expect(nomeNeutroDoTelao("João")).toBe("J·");
    expect(nomeNeutroDoTelao("tio joão")).toBe("T·");
    expect(nomeNeutroDoTelao("Érica")).toBe("É·");
  });

  it("é idempotente no placeholder", () => {
    expect(nomeNeutroDoTelao("J·")).toBe("J·");
  });

  it("cai em Convidado quando não há letra", () => {
    expect(nomeNeutroDoTelao("💩")).toBe(NOME_NEUTRO_DO_TELAO);
    expect(nomeNeutroDoTelao("123")).toBe(NOME_NEUTRO_DO_TELAO);
    expect(nomeNeutroDoTelao("   ")).toBe(NOME_NEUTRO_DO_TELAO);
  });
});

describe("validar nome de exibição", () => {
  it("aceita apelido curto e recusa vazio ou longo demais", () => {
    expect(validarNomeDeExibicao("Bia")).toBe("Bia");
    expect(validarNomeDeExibicao("  Ana  ")).toBe("Ana");
    expect(validarNomeDeExibicao("x")).toBeNull();
    expect(validarNomeDeExibicao("   ")).toBeNull();
    expect(validarNomeDeExibicao("x".repeat(41))).toBeNull();
  });
});
