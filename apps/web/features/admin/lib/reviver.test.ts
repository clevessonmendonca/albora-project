import { describe, expect, it } from "vitest";
import { capitulosDoReviver, type MidiaDoReviver, type MomentoDoPack } from "./reviver";

const MOMENTOS: MomentoDoPack[] = [
  { id: "a", chaveTitulo: "m.a", chaveDesc: "m.a.desc" },
  { id: "b", chaveTitulo: "m.b", chaveDesc: "m.b.desc" },
  { id: "c", chaveTitulo: "m.c", chaveDesc: "m.c.desc" },
];

const VOCAB = {
  "m.a": "Primeiro",
  "m.a.desc": "O começo.",
  "m.b": "Segundo",
  "m.b.desc": "O meio.",
  "m.c": "Terceiro",
  "m.c.desc": "O fim.",
};

function midia(id: string, hora: number, destacada = false): MidiaDoReviver {
  return {
    id,
    thumb: `https://exemplo/${id}`,
    em: `2026-09-20T${String(hora).padStart(2, "0")}:00:00.000Z`,
    destacada,
  };
}

function muitas(n: number): MidiaDoReviver[] {
  return Array.from({ length: n }, (_, i) => midia(`f${i}`, 10 + i));
}

describe("capitulosDoReviver", () => {
  it("sem fotos suficientes, não inventa narrativa", () => {
    expect(capitulosDoReviver(muitas(2), MOMENTOS, VOCAB)).toEqual([]);
  });

  it("pack sem momentos não gera capítulo — o arco é do pack, não do componente", () => {
    expect(capitulosDoReviver(muitas(30), [], VOCAB)).toEqual([]);
  });

  it("não cria mais capítulos do que o pack declara", () => {
    expect(capitulosDoReviver(muitas(60), MOMENTOS, VOCAB)).toHaveLength(3);
  });

  it("com poucas fotos, faz menos capítulos em vez de capítulos vazios", () => {
    const capitulos = capitulosDoReviver(muitas(6), MOMENTOS, VOCAB);
    expect(capitulos).toHaveLength(2);
    expect(capitulos.every((c) => c.fotos >= 3)).toBe(true);
  });

  it("tira título e descrição do vocabulário do pack", () => {
    const [primeiro] = capitulosDoReviver(muitas(9), MOMENTOS, VOCAB);
    expect(primeiro?.titulo).toBe("Primeiro");
    expect(primeiro?.descricao).toBe("O começo.");
  });

  it("ordena pela hora em que a foto aconteceu, não pela ordem recebida", () => {
    const foraDeOrdem = [midia("tarde", 23), midia("cedo", 18), midia("meio", 20)];
    const [unico] = capitulosDoReviver(foraDeOrdem, MOMENTOS, VOCAB);
    expect(unico?.em).toBe("2026-09-20T18:00:00.000Z");
  });

  it("a capa é o destaque do casal quando existe um", () => {
    const fotos = [midia("a", 18), midia("b", 19, true), midia("c", 20)];
    const [unico] = capitulosDoReviver(fotos, MOMENTOS, VOCAB);
    expect(unico?.capa.id).toBe("b");
  });

  it("sem destaque, a capa é o meio do trecho e não a primeira foto", () => {
    const [unico] = capitulosDoReviver([midia("a", 18), midia("b", 19), midia("c", 20)], MOMENTOS, VOCAB);
    expect(unico?.capa.id).toBe("b");
  });

  it("todas as fotos entram em algum capítulo — nenhuma some da noite", () => {
    const capitulos = capitulosDoReviver(muitas(11), MOMENTOS, VOCAB);
    expect(capitulos.reduce((n, c) => n + c.fotos, 0)).toBe(11);
  });
});
