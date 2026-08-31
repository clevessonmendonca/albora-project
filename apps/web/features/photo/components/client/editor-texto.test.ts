import { describe, expect, it } from "vitest";
import { comConteudo, LIMITE_TEXTO, TAMANHO_PADRAO, textoTemConteudo } from "./editor-texto";

describe("textoTemConteudo", () => {
  it("nulo não tem conteúdo", () => {
    expect(textoTemConteudo(null)).toBe(false);
  });

  it("só espaço não tem conteúdo — mesma regra do core (processarFoto)", () => {
    expect(textoTemConteudo({ conteudo: "   ", x: 0.5, y: 0.5, tamanho: 0.1 })).toBe(false);
  });

  it("texto real tem conteúdo", () => {
    expect(textoTemConteudo({ conteudo: "oi", x: 0.5, y: 0.5, tamanho: 0.1 })).toBe(true);
  });
});

describe("comConteudo", () => {
  it("primeira letra nasce no centro, com o tamanho padrão", () => {
    const texto = comConteudo(null, "o");
    expect(texto).toEqual({ conteudo: "o", x: 0.5, y: 0.5, tamanho: TAMANHO_PADRAO });
  });

  it("preserva posição e tamanho já escolhidos ao digitar mais", () => {
    const anterior = { conteudo: "o", x: 0.2, y: 0.7, tamanho: 0.12 };
    const texto = comConteudo(anterior, "oi!");
    expect(texto).toEqual({ conteudo: "oi!", x: 0.2, y: 0.7, tamanho: 0.12 });
  });

  it("corta no limite de caracteres em vez de deixar o texto vazar da foto", () => {
    const longo = "x".repeat(LIMITE_TEXTO + 20);
    const texto = comConteudo(null, longo);
    expect(texto.conteudo).toHaveLength(LIMITE_TEXTO);
  });
});
