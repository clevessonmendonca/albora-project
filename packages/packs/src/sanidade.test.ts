import { ALBORA_BRAND, resolveTokens } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { WEDDING } from "./casamento";
import { FIFTEEN_YEARS } from "./quinze-anos";
import { isValidConfessionPrompt, isValidMissionKey, isValidPlace, PACKS, packProblems, resolvePackText } from "./index";

/**
 * O teste de sanidade do CLAUDE.md: trocar o pack de um evento muda toda a UI
 * sem tocar uma linha do núcleo.
 *
 * Ele só tem valor com dois packs. Com um, passaria mesmo que o vocabulário de
 * casamento estivesse escrito dentro do núcleo.
 */
describe("trocar o pack muda a UI, não o núcleo", () => {
  it("a mesma chave devolve texto diferente por pack", () => {
    expect(resolvePackText(WEDDING, "anfitriao.plural")).toBe("os noivos");
    expect(resolvePackText(FIFTEEN_YEARS, "anfitriao.plural")).toBe("a aniversariante");
    expect(resolvePackText(WEDDING, "recado.rotulo")).toBe("Um recado dos noivos");
    expect(resolvePackText(FIFTEEN_YEARS, "recado.rotulo")).toBe("Um recado da aniversariante");
  });

  it("todo pack registrado responde ao que o núcleo pede", () => {
    // Antes este teste exigia conjuntos de chaves idênticos. Isso deixou de
    // valer quando missão e lugar entraram no vocabulário: um casamento tem
    // altar e um aniversário não, e igualar os conjuntos forçaria um pack a
    // inventar lugares que a festa não tem. O que precisa bater é o que o
    // núcleo desenha — e isso `packProblems` verifica por chave.
    for (const [id, pack] of Object.entries(PACKS)) {
      expect(packProblems(pack), id).toEqual([]);
    }
  });

  it("missão e lugar podem divergir entre packs", () => {
    expect(WEDDING.lugares.map((l) => l.id)).toContain("altar");
    expect(FIFTEEN_YEARS.lugares.map((l) => l.id)).not.toContain("altar");
  });

  it("missão fora da lista do pack é recusada", () => {
    expect(isValidMissionKey(WEDDING, "missao.danca")).toBe(true);
    expect(isValidMissionKey(FIFTEEN_YEARS, "missao.danca")).toBe(false);
    expect(isValidMissionKey(FIFTEEN_YEARS, "missao.valsa")).toBe(true);
    expect(isValidMissionKey(WEDDING, "A mesa mais cheia")).toBe(false);
    expect(isValidMissionKey(WEDDING, "chegada")).toBe(false);
    expect(isValidMissionKey(WEDDING, null)).toBe(false);
  });

  it("lugar fora da lista do pack é recusado", () => {
    // É a validação de conjunto fechado que o confirm usa. Campo livre aqui
    // seria a mesma superfície de abuso do nome, projetada no telão.
    expect(isValidPlace(WEDDING, "altar")).toBe(true);
    expect(isValidPlace(FIFTEEN_YEARS, "altar")).toBe(false);
    expect(isValidPlace(WEDDING, "-22.9068,-43.1729")).toBe(false);
    expect(isValidPlace(WEDDING, null)).toBe(false);
  });

  it("pergunta do confessionário fora da lista é recusada", () => {
    expect(isValidConfessionPrompt(WEDDING, "confessionario.conselho")).toBe(true);
    expect(isValidConfessionPrompt(WEDDING, "texto livre")).toBe(false);
    expect(isValidConfessionPrompt(WEDDING, null)).toBe(false);
    expect(WEDDING.confessionario?.length).toBeGreaterThan(0);
    expect(FIFTEEN_YEARS.confessionario?.length).toBeGreaterThan(0);
  });

  it("chave ausente devolve a própria chave, nunca vazio", () => {
    expect(resolvePackText(WEDDING, "nao.existe")).toBe("nao.existe");
  });

  it("o pack entra na cadeia de tokens sem substituir a marca", () => {
    const r = resolveTokens({ marca: ALBORA_BRAND, pack: WEDDING.tokens ?? {} });

    expect(r.fontes.titulo).toBe("Fraunces, Georgia, serif");
    expect(r.cores.papel).toBe(ALBORA_BRAND.cores.papel);
  });
});

describe("nenhuma palavra de domínio fora do pack", () => {
  it("todo pack registrado tem id sem acento e sem espaço", () => {
    for (const id of Object.keys(PACKS)) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

