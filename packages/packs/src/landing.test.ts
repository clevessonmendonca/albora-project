import { describe, expect, it } from "vitest";
import { CHAVES_DA_LANDING, PACKS, problemasDaLanding, texto } from "./index";

/**
 * A landing é vendida por pack, e um pack sem copy renderiza `landing.titulo`
 * em corpo 74px. `texto()` devolve a chave de propósito — barato numa tela
 * interna, caro na porta de entrada do funil.
 */
describe("vocabulário de landing", () => {
  const packs = Object.entries(PACKS);

  it.each(packs)("%s tem todas as chaves da landing", (_id, pack) => {
    expect(problemasDaLanding(pack)).toEqual([]);
  });

  it.each(packs)("%s não deixa nenhuma chave vazar como texto", (_id, pack) => {
    for (const chave of CHAVES_DA_LANDING) {
      expect(texto(pack, chave)).not.toBe(chave);
    }
  });

  it("cada pack diz a própria coisa no herói", () => {
    // Dois packs com o mesmo título significa que a landing é genérica e a
    // troca de pack não prova nada — que é o teste de sanidade do CLAUDE.md.
    const titulos = packs.map(([, p]) => texto(p, "landing.titulo"));
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("nenhum pack nomeia a missão de desafio", () => {
    // A landing afirma "não se chama desafio, chama-se missão", e um pack que
    // contradiz isso deixa a marca incoerente dentro da própria página.
    //
    // Só as chaves `missao.*`: a frase que **rejeita** a palavra precisa
    // dizê-la, e reprová-la faria a regra proibir o próprio enunciado.
    for (const [, pack] of packs) {
      for (const [chave, valor] of Object.entries(pack.vocabulario)) {
        if (!chave.startsWith("missao.")) continue;
        expect(valor.toLowerCase(), chave).not.toMatch(/\bdesafios?\b/);
      }
    }
  });
});
