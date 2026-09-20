import { describe, expect, it } from "vitest";
import {
  LANDING_VOCABULARY_KEYS,
  PACKS,
  landingProblems,
  resolvePackText,
  temLandingPropria,
} from "./index";

/** Pack sem copy renderiza `landing.titulo` em corpo 74px na porta do funil — `resolvePackText()` devolve a chave de propósito, que é barato aqui e catastrófico lá. */
describe("vocabulário de landing", () => {
  const packs = Object.entries(PACKS).filter(([, p]) => temLandingPropria(p));

  it.each(packs)("%s tem todas as chaves da landing", (_id, pack) => {
    expect(landingProblems(pack)).toEqual([]);
  });

  it.each(packs)("%s não deixa nenhuma chave vazar como texto", (_id, pack) => {
    for (const chave of LANDING_VOCABULARY_KEYS) {
      expect(resolvePackText(pack, chave)).not.toBe(chave);
    }
  });

  it("cada pack diz a própria coisa no herói", () => {
    const titulos = packs.map(([, p]) => resolvePackText(p, "landing.titulo"));
    expect(new Set(titulos).size).toBe(titulos.length);
  });

  it("cada pack conta o próprio arco da noite", () => {
    const arcos = packs.map(([, p]) =>
      (p.momentos ?? []).map((m) => resolvePackText(p, m.chaveTitulo)).join(" · "),
    );

    expect(new Set(arcos).size).toBe(arcos.length);
    for (const arco of arcos) expect(arco).not.toBe("");
  });

  it("nenhum pack nomeia a missão de desafio", () => {
    // "desafio" carrega competição — oposto do convite.
    for (const [, pack] of packs) {
      for (const [chave, valor] of Object.entries(pack.vocabulario)) {
        expect(valor.toLowerCase(), chave).not.toMatch(/\bdesafios?\b/);
      }
    }
  });
});
