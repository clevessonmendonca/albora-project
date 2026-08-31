import { ALBORA_BRAND, resolveTokens } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { WEDDING } from "./casamento";
import { FIFTEEN_YEARS } from "./quinze-anos";
import { isValidConfessionPrompt, isValidMissionKey, isValidPlace, PACKS, packProblems, resolvePackText } from "./index";

/** Sanidade do CLAUDE.md — só tem valor com dois packs; com um, passaria mesmo que o vocabulário de casamento estivesse no núcleo. */
describe("trocar o pack muda a UI, não o núcleo", () => {
  it("a mesma chave devolve texto diferente por pack", () => {
    expect(resolvePackText(WEDDING, "anfitriao.plural")).toBe("os noivos");
    expect(resolvePackText(FIFTEEN_YEARS, "anfitriao.plural")).toBe("a aniversariante");
    expect(resolvePackText(WEDDING, "recado.rotulo")).toBe("Um recado dos noivos");
    expect(resolvePackText(FIFTEEN_YEARS, "recado.rotulo")).toBe("Um recado da aniversariante");
  });

  it("todo pack registrado responde ao que o núcleo pede", () => {
    for (const [id, pack] of Object.entries(PACKS)) {
      expect(packProblems(pack), id).toEqual([]);
    }
  });

  it("todo pack tem descrição própria — o wizard não pode depender de copy de landing", () => {
    // `resolvePackText` devolve a chave quando falta. O wizard usava
    // `landing.rotulo`, então pack sem funil renderizava a string "landing.rotulo"
    // na tela de criação do evento.
    for (const [id, pack] of Object.entries(PACKS)) {
      const desc = resolvePackText(pack, "evento.descricao");
      expect(desc, id).not.toBe("evento.descricao");
      expect(desc.length, id).toBeGreaterThan(10);
    }

    const descricoes = Object.values(PACKS).map((p) => resolvePackText(p, "evento.descricao"));
    expect(new Set(descricoes).size).toBe(descricoes.length);
  });

  it("sugereAntes aponta para pack registrado, e nem todo pack tem um", () => {
    // A seção de festas anteriores na landing e o convite no admin são
    // controlados por isto. Apontar para um id inexistente sumiria com a seção
    // em silêncio; e um pack que não tem festas anteriores não deve declarar.
    for (const [id, pack] of Object.entries(PACKS)) {
      if (pack.sugereAntes === undefined) continue;
      expect(PACKS[pack.sugereAntes], `${id} aponta para pack inexistente`).toBeDefined();
      expect(pack.sugereAntes, `${id} não pode sugerir a si mesmo`).not.toBe(id);
    }

    expect(WEDDING.sugereAntes).toBe("pre-casamento");
    // Aniversário de 15 anos não tem noivado nem chá de panela.
    expect(FIFTEEN_YEARS.sugereAntes).toBeUndefined();
  });

  it("o pack sugerido traz a copy do convite — sem ela a seção sai sem texto", () => {
    for (const pack of Object.values(PACKS)) {
      if (!pack.sugereAntes) continue;
      const sugerido = PACKS[pack.sugereAntes]!;
      for (const chave of [
        "sugestao.rotulo",
        "sugestao.chamada",
        "sugestao.titulo",
        "sugestao.lede",
        "sugestao.efeito",
        "sugestao.cta",
      ]) {
        expect(resolvePackText(sugerido, chave), chave).not.toBe(chave);
      }
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

