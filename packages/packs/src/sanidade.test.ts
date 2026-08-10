import { MARCA_ALBORA, resolverTokens } from "@albora/tokens";
import { describe, expect, it } from "vitest";
import { CASAMENTO } from "./casamento";
import { QUINZE_ANOS } from "./quinze-anos";
import { PACKS, texto } from "./index";

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

  it("os dois packs cobrem exatamente as mesmas chaves", () => {
    // Chave faltando num pack é tela em português de outro evento.
    expect(Object.keys(CASAMENTO.vocabulario).sort()).toEqual(
      Object.keys(QUINZE_ANOS.vocabulario).sort(),
    );
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
