import { MARCA_ALBORA, resolverTokens } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { CASAMENTO } from "./casamento";
import { QUINZE_ANOS } from "./quinze-anos";
import { lugarValido, PACKS, problemasDoPack, texto } from "./index";

/**
 * O teste de sanidade do CLAUDE.md: trocar o pack de um evento muda toda a UI
 * sem tocar uma linha do núcleo.
 *
 * Ele só tem valor com dois packs. Com um, passaria mesmo que o vocabulário de
 * casamento estivesse escrito dentro do núcleo.
 */
describe("trocar o pack muda a UI, não o núcleo", () => {
  it("a mesma chave devolve texto diferente por pack", () => {
    expect(texto(CASAMENTO, "anfitriao.plural")).toBe("os noivos");
    expect(texto(QUINZE_ANOS, "anfitriao.plural")).toBe("a aniversariante");
  });

  it("todo pack registrado responde ao que o núcleo pede", () => {
    // Antes este teste exigia conjuntos de chaves idênticos. Isso deixou de
    // valer quando missão e lugar entraram no vocabulário: um casamento tem
    // altar e um aniversário não, e igualar os conjuntos forçaria um pack a
    // inventar lugares que a festa não tem. O que precisa bater é o que o
    // núcleo desenha — e isso `problemasDoPack` verifica por chave.
    for (const [id, pack] of Object.entries(PACKS)) {
      expect(problemasDoPack(pack), id).toEqual([]);
    }
  });

  it("missão e lugar podem divergir entre packs", () => {
    expect(CASAMENTO.lugares.map((l) => l.id)).toContain("altar");
    expect(QUINZE_ANOS.lugares.map((l) => l.id)).not.toContain("altar");
  });

  it("lugar fora da lista do pack é recusado", () => {
    // É a validação de conjunto fechado que o confirm usa. Campo livre aqui
    // seria a mesma superfície de abuso do nome, projetada no telão.
    expect(lugarValido(CASAMENTO, "altar")).toBe(true);
    expect(lugarValido(QUINZE_ANOS, "altar")).toBe(false);
    expect(lugarValido(CASAMENTO, "-22.9068,-43.1729")).toBe(false);
    expect(lugarValido(CASAMENTO, null)).toBe(false);
  });

  it("chave ausente devolve a própria chave, nunca vazio", () => {
    expect(texto(CASAMENTO, "nao.existe")).toBe("nao.existe");
  });

  it("o pack entra na cadeia de tokens sem substituir a marca", () => {
    const r = resolverTokens({ marca: MARCA_ALBORA, pack: CASAMENTO.tokens ?? {} });

    expect(r.fontes.titulo).toBe("Fraunces, Georgia, serif");
    expect(r.cores.papel).toBe(MARCA_ALBORA.cores.papel);
  });
});

describe("nenhuma palavra de domínio fora do pack", () => {
  it("todo pack registrado tem id sem acento e sem espaço", () => {
    for (const id of Object.keys(PACKS)) {
      expect(id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});
