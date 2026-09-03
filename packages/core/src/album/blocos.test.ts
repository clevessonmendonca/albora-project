import { describe, expect, it } from "vitest";
import { agruparEmBlocos, diagramarBloco } from "./blocos";
import { CAPITULO_UNICO, CAPITULO_SEM_HORA, CAPITULO_CONFESSIONARIO } from "./tempo";
import type { Bloco, MidiaResolvida, PlanoDoAlbum } from "./types";

function resolvida(overrides: Partial<MidiaResolvida> = {}): MidiaResolvida {
  return {
    id: "m1",
    sessaoId: "s1",
    capturadaEm: new Date("2026-09-01T23:00:00Z"),
    recebidaEm: new Date("2026-09-01T23:01:00Z"),
    largura: 1080,
    altura: 1920,
    lugarId: null,
    missaoId: null,
    reacoes: 0,
    em: new Date("2026-09-01T23:00:00Z"),
    horaConfiavel: true,
    capituloId: CAPITULO_UNICO,
    inicioDaHora: new Date("2026-09-01T23:00:00Z"),
    hora: 20,
    amanhecer: false,
    ...overrides,
  };
}

const PLANO: PlanoDoAlbum = {
  janela: {
    comecaEm: new Date("2026-09-01T21:00:00Z"),
    terminaEm: new Date("2026-09-02T05:00:00Z"),
    offsetMinutos: -180,
  },
  capitulos: [],
  tetoDePaginas: 80,
};

describe("agruparEmBlocos", () => {
  it("agrupa mídias do mesmo capítulo/hora/lugar", () => {
    const midias = [
      resolvida({ id: "m1" }),
      resolvida({ id: "m2" }),
    ];
    const blocos = agruparEmBlocos(midias, PLANO);
    expect(blocos).toHaveLength(1);
    expect(blocos[0]!.midias).toHaveLength(2);
  });

  it("separa mídias de horas diferentes", () => {
    const midias = [
      resolvida({ id: "m1", inicioDaHora: new Date("2026-09-01T23:00:00Z") }),
      resolvida({ id: "m2", inicioDaHora: new Date("2026-09-02T00:00:00Z") }),
    ];
    const blocos = agruparEmBlocos(midias, PLANO);
    expect(blocos).toHaveLength(2);
  });

  it("separa mídias de lugares diferentes", () => {
    const midias = [
      resolvida({ id: "m1", lugarId: "salao" }),
      resolvida({ id: "m2", lugarId: "jardim" }),
    ];
    const blocos = agruparEmBlocos(midias, PLANO);
    expect(blocos).toHaveLength(2);
  });

  it("ordena capítulos na sequência do plano", () => {
    const plano: PlanoDoAlbum = {
      ...PLANO,
      capitulos: [
        { id: "cerimonia", comecaEm: new Date("2026-09-01T20:00:00Z") },
        { id: "festa", comecaEm: new Date("2026-09-01T22:00:00Z") },
      ],
    };
    const midias = [
      resolvida({ id: "m1", capituloId: "festa" }),
      resolvida({ id: "m2", capituloId: "cerimonia" }),
    ];
    const blocos = agruparEmBlocos(midias, plano);
    expect(blocos[0]!.capituloId).toBe("cerimonia");
    expect(blocos[1]!.capituloId).toBe("festa");
  });

  it("sem-hora fica por último", () => {
    const midias = [
      resolvida({ id: "m1", capituloId: CAPITULO_SEM_HORA, inicioDaHora: null }),
      resolvida({ id: "m2", capituloId: CAPITULO_UNICO }),
    ];
    const blocos = agruparEmBlocos(midias, PLANO);
    expect(blocos[blocos.length - 1]!.capituloId).toBe(CAPITULO_SEM_HORA);
  });

  it("confessionário fica antes de sem-hora", () => {
    const midias = [
      resolvida({ id: "m1", capituloId: CAPITULO_SEM_HORA, inicioDaHora: null }),
      resolvida({ id: "m2", capituloId: CAPITULO_CONFESSIONARIO, inicioDaHora: null }),
    ];
    const blocos = agruparEmBlocos(midias, PLANO);
    expect(blocos[0]!.capituloId).toBe(CAPITULO_CONFESSIONARIO);
    expect(blocos[1]!.capituloId).toBe(CAPITULO_SEM_HORA);
  });

  it("lista vazia retorna vazia", () => {
    expect(agruparEmBlocos([], PLANO)).toHaveLength(0);
  });
});

describe("diagramarBloco", () => {
  it("diagrama bloco com uma mídia retrato em uma página", () => {
    const bloco: Bloco = {
      capituloId: CAPITULO_UNICO,
      inicioDaHora: null,
      hora: null,
      amanhecer: false,
      lugarId: null,
      midias: [resolvida({ largura: 1080, altura: 1920 })],
    };
    const paginas = diagramarBloco(bloco);
    expect(paginas).toHaveLength(1);
    expect(paginas[0]!.fotos).toHaveLength(1);
  });

  it("diagrama bloco com três retratos em uma tira", () => {
    const bloco: Bloco = {
      capituloId: CAPITULO_UNICO,
      inicioDaHora: null,
      hora: null,
      amanhecer: false,
      lugarId: null,
      midias: [
        resolvida({ id: "m1", largura: 1080, altura: 1920 }),
        resolvida({ id: "m2", largura: 1080, altura: 1920 }),
        resolvida({ id: "m3", largura: 1080, altura: 1920 }),
      ],
    };
    const paginas = diagramarBloco(bloco);
    expect(paginas).toHaveLength(1);
    expect(paginas[0]!.fotos).toHaveLength(3);
    expect(paginas[0]!.layoutId).toBe("tira-retrato");
  });

  it("preserva metadados do bloco nas páginas", () => {
    const bloco: Bloco = {
      capituloId: "festa",
      inicioDaHora: new Date("2026-09-01T23:00:00Z"),
      hora: 20,
      amanhecer: false,
      lugarId: "salao",
      midias: [resolvida()],
    };
    const pagina = diagramarBloco(bloco)[0]!;
    expect(pagina.capituloId).toBe("festa");
    expect(pagina.hora).toBe(20);
    expect(pagina.lugarId).toBe("salao");
  });

  it("bloco vazio retorna zero páginas", () => {
    const bloco: Bloco = {
      capituloId: CAPITULO_UNICO,
      inicioDaHora: null,
      hora: null,
      amanhecer: false,
      lugarId: null,
      midias: [],
    };
    expect(diagramarBloco(bloco)).toHaveLength(0);
  });

  it("múltiplas páginas quando mídias excedem maior layout", () => {
    const bloco: Bloco = {
      capituloId: CAPITULO_UNICO,
      inicioDaHora: null,
      hora: null,
      amanhecer: false,
      lugarId: null,
      midias: Array.from({ length: 7 }, (_, i) =>
        resolvida({ id: `m${i}`, largura: 1080, altura: 1920 }),
      ),
    };
    const paginas = diagramarBloco(bloco);
    expect(paginas.length).toBeGreaterThan(1);
    const totalFotos = paginas.reduce((s, p) => s + p.fotos.length, 0);
    expect(totalFotos).toBe(7);
  });
});
