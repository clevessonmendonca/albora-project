import { describe, expect, it } from "vitest";
import { capitulosDoReviver, hora, tempoJuntoEmHoras, type MidiaDoReviver, type MomentoDoReviver } from "./reviver";

const MOMENTOS: MomentoDoReviver[] = [
  { id: "a", titulo: "Primeiro", descricao: "O começo." },
  { id: "b", titulo: "Segundo", descricao: "O meio." },
  { id: "c", titulo: "Terceiro", descricao: "O fim." },
];

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
    expect(capitulosDoReviver(muitas(2), MOMENTOS)).toEqual([]);
  });

  it("pack sem momentos não gera capítulo — o arco é do pack, não do componente", () => {
    expect(capitulosDoReviver(muitas(30), [])).toEqual([]);
  });

  it("não cria mais capítulos do que o pack declara", () => {
    expect(capitulosDoReviver(muitas(60), MOMENTOS)).toHaveLength(3);
  });

  it("com poucas fotos, faz menos capítulos em vez de capítulos vazios", () => {
    const capitulos = capitulosDoReviver(muitas(6), MOMENTOS);
    expect(capitulos).toHaveLength(2);
    expect(capitulos.every((c) => c.fotos >= 3)).toBe(true);
  });

  // `ceil` engordava os primeiros capítulos e jogava o resto no último: com 10
  // fotos e 3 momentos saía [4, 4, 2], e o último violava o próprio mínimo.
  it("nenhum capítulo fica abaixo do mínimo, em nenhuma contagem", () => {
    for (let n = 3; n <= 40; n += 1) {
      const capitulos = capitulosDoReviver(muitas(n), MOMENTOS);
      const tamanhos = capitulos.map((c) => c.fotos);
      expect(tamanhos.every((t) => t >= 3), `${n} fotos → ${tamanhos.join(",")}`).toBe(true);
      expect(tamanhos.reduce((a, b) => a + b, 0), `${n} fotos`).toBe(n);
    }
  });

  it("distribui a sobra em vez de despejar tudo no último capítulo", () => {
    expect(capitulosDoReviver(muitas(10), MOMENTOS).map((c) => c.fotos)).toEqual([4, 3, 3]);
  });

  it("tira título e descrição do vocabulário do pack", () => {
    const [primeiro] = capitulosDoReviver(muitas(9), MOMENTOS);
    expect(primeiro?.titulo).toBe("Primeiro");
    expect(primeiro?.descricao).toBe("O começo.");
  });

  it("ordena pela hora em que a foto aconteceu, não pela ordem recebida", () => {
    const foraDeOrdem = [midia("tarde", 23), midia("cedo", 18), midia("meio", 20)];
    const [unico] = capitulosDoReviver(foraDeOrdem, MOMENTOS);
    expect(unico?.em).toBe("2026-09-20T18:00:00.000Z");
  });

  it("a capa é o destaque do casal quando existe um", () => {
    const fotos = [midia("a", 18), midia("b", 19, true), midia("c", 20)];
    const [unico] = capitulosDoReviver(fotos, MOMENTOS);
    expect(unico?.capa.id).toBe("b");
  });

  it("sem destaque, a capa é o meio do trecho e não a primeira foto", () => {
    const [unico] = capitulosDoReviver([midia("a", 18), midia("b", 19), midia("c", 20)], MOMENTOS);
    expect(unico?.capa.id).toBe("b");
  });

  it("todas as fotos entram em algum capítulo — nenhuma some da noite", () => {
    const capitulos = capitulosDoReviver(muitas(11), MOMENTOS);
    expect(capitulos.reduce((n, c) => n + c.fotos, 0)).toBe(11);
  });
});

describe("tempoJuntoEmHoras", () => {
  it("sem fotos, não inventa duração", () => {
    expect(tempoJuntoEmHoras([])).toBe(0);
  });

  it("uma só foto não separa um intervalo", () => {
    expect(tempoJuntoEmHoras([midia("a", 20)])).toBe(0);
  });

  it("mede da primeira à última, não da ordem de chegada", () => {
    const fotos = [midia("tarde", 23), midia("cedo", 18), midia("meio", 20)];
    expect(tempoJuntoEmHoras(fotos)).toBe(5);
  });

  it("arredonda para a hora mais próxima", () => {
    const fotos = [
      { em: "2026-09-20T18:00:00.000Z" },
      { em: "2026-09-20T20:40:00.000Z" },
    ];
    expect(tempoJuntoEmHoras(fotos)).toBe(3);
  });
});

describe("hora", () => {
  it("formata no fuso do evento, com 'h' em vez de ':'", () => {
    expect(hora("2026-09-20T23:15:00.000Z", "America/Sao_Paulo")).toBe("20h15");
  });

  it("fuso inválido não derruba a tela — devolve vazio", () => {
    expect(hora("2026-09-20T23:15:00.000Z", "Lugar/Que/Nao/Existe")).toBe("");
  });
});
