import { describe, expect, it } from "vitest";
import {
  CAPITULO_SEM_HORA,
  CAPITULO_UNICO,
  JANELA_DE_RAJADA_MS,
  agruparEmBlocos,
  capituloDe,
  contarAcervo,
  diagramarBloco,
  ehAmanhecer,
  escolherLayout,
  horaNoEvento,
  inicioDaHoraNoEvento,
  instanteDaParede,
  instanteDe,
  montarAlbum,
  ordemDeDescarte,
  ordemNaRajada,
  planejarCapitulos,
  primeiroAmanhecerNaJanela,
  proporcaoDe,
  resolver,
  selecionarParaAlbum,
  slotAceita,
  slotCorta,
  type CapituloPlanejado,
  type JanelaDoEvento,
  type MidiaDoAlbum,
  type PlanoDoAlbum,
} from "./album";

/** Brasília: o fuso do evento, que é o único que vale. */
const OFFSET = -180;

const JANELA: JanelaDoEvento = {
  comecaEm: new Date("2026-08-08T22:00:00Z"),
  terminaEm: new Date("2026-08-09T09:00:00Z"),
  offsetMinutos: OFFSET,
};

const CAPITULOS: CapituloPlanejado[] = [
  { id: "chegada", comecaEm: new Date("2026-08-08T22:00:00Z") },
  { id: "cerimonia", comecaEm: new Date("2026-08-08T23:00:00Z") },
  { id: "festa", comecaEm: new Date("2026-08-09T00:00:00Z") },
  { id: "amanhecer", comecaEm: new Date("2026-08-09T08:00:00Z") },
];

function plano(parcial: Partial<PlanoDoAlbum> = {}): PlanoDoAlbum {
  return { janela: JANELA, capitulos: CAPITULOS, tetoDePaginas: 80, ...parcial };
}

const EM_PE = { largura: 1080, altura: 1920 };
const DEITADA = { largura: 1920, altura: 1080 };
const QUADRADA = { largura: 1200, altura: 1200 };

function foto(parcial: Partial<MidiaDoAlbum> & { id: string }): MidiaDoAlbum {
  return {
    sessaoId: "s1",
    capturadaEm: new Date("2026-08-09T01:00:00Z"),
    recebidaEm: new Date("2026-08-09T01:00:05Z"),
    lugarId: "salao",
    missaoId: null,
    reacoes: 0,
    ...EM_PE,
    ...parcial,
  };
}

describe("a unidade é a hora, e a hora é a do evento", () => {
  it("agrupa pela hora do taken_at", () => {
    const a = foto({ id: "a", capturadaEm: new Date("2026-08-09T01:10:00Z") });
    const b = foto({ id: "b", capturadaEm: new Date("2026-08-09T01:50:00Z") });
    const c = foto({ id: "c", capturadaEm: new Date("2026-08-09T02:05:00Z") });

    const [ra, rb, rc] = resolver([a, b, c], plano());

    expect(ra?.inicioDaHora?.toISOString()).toBe("2026-08-09T01:00:00.000Z");
    expect(rb?.inicioDaHora?.toISOString()).toBe("2026-08-09T01:00:00.000Z");
    expect(rc?.inicioDaHora?.toISOString()).toBe("2026-08-09T02:00:00.000Z");
  });

  it("cai no recebidaEm quando o taken_at não veio", () => {
    // O EXIF é apagado no cliente; o taken_at é o único campo que sobrevive, e
    // às vezes nem ele. Sem a queda, a foto ficaria sem faixa.
    const sem = foto({
      id: "a",
      capturadaEm: null,
      recebidaEm: new Date("2026-08-09T02:30:00Z"),
    });

    expect(instanteDe(sem, JANELA)).toEqual({
      em: new Date("2026-08-09T02:30:00Z"),
      confiavel: true,
    });
  });

  it("relógio de aparelho errado não arrasta a foto para outra faixa", () => {
    // O risco que a spec nomeia. Um taken_at de três dias antes é fuso ou
    // relógio errado, não memória de outra festa — vale o relógio do servidor.
    const torta = foto({
      id: "a",
      capturadaEm: new Date("2026-08-05T14:00:00Z"),
      recebidaEm: new Date("2026-08-09T02:30:00Z"),
    });

    expect(instanteDe(torta, JANELA).em.toISOString()).toBe("2026-08-09T02:30:00.000Z");
  });

  it("foto sem hora confiável cai no capítulo próprio, e não some", () => {
    const perdida = foto({
      id: "perdida",
      capturadaEm: null,
      recebidaEm: new Date("2026-08-12T15:00:00Z"),
    });

    const album = montarAlbum([perdida], plano());
    const ids = album.capitulos.flatMap((c) => c.paginas.flatMap((p) => p.fotos.map((f) => f.midia.id)));

    expect(ids).toContain("perdida");
    expect(album.capitulos.at(-1)?.id).toBe(CAPITULO_SEM_HORA);
    expect(resolver([perdida], plano())[0]?.hora).toBeNull();
  });

  it("o sem-hora fecha o álbum, nunca entra no meio do arco", () => {
    const album = montarAlbum(
      [
        foto({ id: "perdida", capturadaEm: null, recebidaEm: new Date("2026-08-12T15:00:00Z") }),
        foto({ id: "amanhecer", capturadaEm: new Date("2026-08-09T08:30:00Z") }),
        foto({ id: "chegada", capturadaEm: new Date("2026-08-08T22:10:00Z") }),
      ],
      plano(),
    );

    expect(album.capitulos.map((c) => c.id)).toEqual(["chegada", "amanhecer", CAPITULO_SEM_HORA]);
  });

  it("ancora no fuso do evento, não no do aparelho", () => {
    // 03:30Z é 00:30 em Brasília. Ler a mesma foto em UTC jogaria a faixa da
    // meia-noite para as 3h e embaralharia a noite inteira.
    const em = new Date("2026-08-09T03:30:00Z");

    expect(horaNoEvento(em, OFFSET)).toBe(0);
    expect(horaNoEvento(em, 0)).toBe(3);
    expect(inicioDaHoraNoEvento(em, OFFSET).toISOString()).toBe("2026-08-09T03:00:00.000Z");
  });

  it("a parede do EXIF vira instante no fuso do evento, não no UTC cru", () => {
    const parede = new Date("2026-08-08T21:00:00.000Z");
    expect(instanteDaParede(parede, OFFSET).toISOString()).toBe("2026-08-09T00:00:00.000Z");
    expect(horaNoEvento(instanteDaParede(parede, OFFSET), OFFSET)).toBe(21);
  });

  it("a chave da faixa é o instante, não o número da hora", () => {
    // Uma festa que passa da meia-noite tem 23h de sábado e 23h de domingo.
    const sabado = inicioDaHoraNoEvento(new Date("2026-08-09T02:10:00Z"), OFFSET);
    const domingo = inicioDaHoraNoEvento(new Date("2026-08-10T02:10:00Z"), OFFSET);

    expect(horaNoEvento(sabado, OFFSET)).toBe(horaNoEvento(domingo, OFFSET));
    expect(sabado.getTime()).not.toBe(domingo.getTime());
  });

  it("marca o amanhecer", () => {
    expect(ehAmanhecer(new Date("2026-08-09T08:30:00Z"), OFFSET)).toBe(true);
    expect(ehAmanhecer(new Date("2026-08-09T02:00:00Z"), OFFSET)).toBe(false);

    const [r] = resolver([foto({ id: "a", capturadaEm: new Date("2026-08-09T08:30:00Z") })], plano());
    expect(r?.amanhecer).toBe(true);
    expect(r?.capituloId).toBe("amanhecer");
  });

  it("foto anterior ao primeiro capítulo entra no primeiro, não fora dele", () => {
    expect(capituloDe(new Date("2026-08-08T21:00:00Z"), CAPITULOS)).toBe("chegada");
    expect(capituloDe(new Date("2026-08-09T01:00:00Z"), CAPITULOS)).toBe("festa");
    expect(capituloDe(new Date("2026-08-09T01:00:00Z"), [])).toBe(CAPITULO_UNICO);
  });
});

describe("o plano da noite sai da janela, não de um horário inventado", () => {
  const ids = ["antes", "cerimonia", "pista", "depois"] as const;

  it("sem ids, o plano fica vazio e a montagem cai na noite inteira", () => {
    expect(planejarCapitulos(JANELA, [])).toEqual([]);
    expect(capituloDe(JANELA.comecaEm, planejarCapitulos(JANELA, []))).toBe(CAPITULO_UNICO);
  });

  it("um id só começa no começo da janela", () => {
    expect(planejarCapitulos(JANELA, ["a-noite"])).toEqual([
      { id: "a-noite", comecaEm: JANELA.comecaEm },
    ]);
  });

  it("o último capítulo começa no primeiro amanhecer da janela", () => {
    const amanhecer = primeiroAmanhecerNaJanela(JANELA);
    expect(amanhecer?.toISOString()).toBe("2026-08-09T08:00:00.000Z");

    const plano = planejarCapitulos(JANELA, ids);
    expect(plano.map((c) => c.id)).toEqual([...ids]);
    expect(plano[0]?.comecaEm.toISOString()).toBe(JANELA.comecaEm.toISOString());
    expect(plano.at(-1)?.comecaEm.toISOString()).toBe(amanhecer?.toISOString());
  });

  it("janela que acaba antes do amanhecer reparte o arco inteiro", () => {
    const tarde: JanelaDoEvento = {
      comecaEm: new Date("2026-08-08T21:00:00Z"),
      terminaEm: new Date("2026-08-09T02:00:00Z"),
      offsetMinutos: OFFSET,
    };
    expect(primeiroAmanhecerNaJanela(tarde)).toBeNull();

    const plano = planejarCapitulos(tarde, ids);
    expect(plano).toHaveLength(4);
    expect(plano[0]?.comecaEm.toISOString()).toBe(tarde.comecaEm.toISOString());
    expect(plano.at(-1)?.comecaEm.getTime()).toBeLessThan(tarde.terminaEm.getTime());
  });

  it("a foto cai no capítulo do instante, e a sem hora não some", () => {
    const capitulos = planejarCapitulos(JANELA, ids);
    const album = montarAlbum(
      [
        foto({ id: "chegada", capturadaEm: new Date("2026-08-08T22:10:00Z") }),
        foto({ id: "alvorada", capturadaEm: new Date("2026-08-09T08:30:00Z") }),
        foto({
          id: "perdida",
          capturadaEm: null,
          recebidaEm: new Date("2026-08-12T15:00:00Z"),
        }),
      ],
      plano({ capitulos }),
    );

    expect(album.capitulos.map((c) => c.id)).toEqual(["antes", "depois", CAPITULO_SEM_HORA]);
  });
});

describe("nunca cortar foto em pé", () => {
  it("slot deitado recusa foto em pé", () => {
    // A mesma regra vermelha do telão: 9:16 num slot 16:9 descarta o topo, que
    // é onde estão as cabeças.
    const slot = { id: "a", proporcao: "paisagem" as const, fracao: 1 };

    expect(proporcaoDe(EM_PE)).toBe("retrato");
    expect(slotAceita(slot, EM_PE)).toBe(false);
    expect(slotCorta(slot, EM_PE)).toBe(true);
  });

  it("a recíproca também corta, e a quadrada não vira nenhuma das duas", () => {
    const retrato = { id: "a", proporcao: "retrato" as const, fracao: 1 };

    expect(slotCorta(retrato, DEITADA)).toBe(true);
    expect(slotCorta(retrato, QUADRADA)).toBe(true);
    expect(proporcaoDe(QUADRADA)).toBe("quadrado");
  });

  it("nenhum slot de um álbum inteiro corta a foto que recebeu", () => {
    // Três de cada quatro fotos de festa são verticais; o teste roda a mistura
    // real e cobra a invariante em toda página, não em um caso escolhido.
    const formas = [EM_PE, EM_PE, EM_PE, DEITADA, QUADRADA];
    const midias = Array.from({ length: 240 }, (_, i) =>
      foto({
        id: `f${String(i).padStart(3, "0")}`,
        sessaoId: `s${i % 12}`,
        capturadaEm: new Date(JANELA.comecaEm.getTime() + i * 150_000),
        ...(formas[i % formas.length] ?? EM_PE),
      }),
    );

    const album = montarAlbum(midias, plano({ tetoDePaginas: 500 }));

    for (const capitulo of album.capitulos) {
      for (const pagina of capitulo.paginas) {
        for (const { slot, midia } of pagina.fotos) {
          expect(slotCorta(slot, midia), `${pagina.layoutId}/${slot.id}/${midia.id}`).toBe(false);
        }
      }
    }
    expect(album.totalDePaginas).toBeGreaterThan(0);
  });

  it("foto sozinha na sua forma ainda ganha página", () => {
    const so = [foto({ id: "unica", ...DEITADA })];

    const album = montarAlbum(so, plano());

    expect(album.totalDePaginas).toBe(1);
    expect(album.capitulos[0]?.paginas[0]?.layoutId).toBe("cheia-paisagem");
  });
});

describe("diagramação por slots", () => {
  it("escolhe o layout mais denso que casa com o começo da fila", () => {
    expect(escolherLayout([EM_PE, EM_PE, EM_PE])?.id).toBe("tira-retrato");
    expect(escolherLayout([EM_PE, EM_PE])?.id).toBe("par-retrato");
    expect(escolherLayout([DEITADA, EM_PE, EM_PE])?.id).toBe("paisagem-e-par");
    expect(escolherLayout([QUADRADA, QUADRADA, QUADRADA, QUADRADA])?.id).toBe("quadrante");
  });

  it("o layout se adapta à sequência, nunca a sequência ao layout", () => {
    // Duas verticais separadas por uma deitada não viram um par: reordenar para
    // encher o layout quebraria a ordem cronológica dentro da página.
    expect(escolherLayout([EM_PE, DEITADA, EM_PE])?.id).toBe("cheia-retrato");
  });

  it("a fração dos slots fecha a página", () => {
    for (const layout of [
      escolherLayout([EM_PE, EM_PE, EM_PE]),
      escolherLayout([DEITADA, EM_PE, EM_PE]),
      escolherLayout([QUADRADA, QUADRADA, QUADRADA, QUADRADA]),
    ]) {
      const soma = (layout?.slots ?? []).reduce((t, s) => t + s.fracao, 0);
      expect(soma).toBeCloseTo(1, 6);
    }
  });

  it("página não mistura lugares", () => {
    // Altar e pista na mesma página lê como erro de montagem.
    const midias = [
      foto({ id: "a", lugarId: "altar", capturadaEm: new Date("2026-08-09T01:10:00Z") }),
      foto({ id: "b", lugarId: "pista", capturadaEm: new Date("2026-08-09T01:20:00Z") }),
    ];

    const paginas = agruparEmBlocos(resolver(midias, plano()), plano()).flatMap(diagramarBloco);

    expect(paginas).toHaveLength(2);
    expect(paginas.map((p) => p.lugarId)).toEqual(["altar", "pista"]);
  });

  it("página não mistura horas", () => {
    const midias = [
      foto({ id: "a", capturadaEm: new Date("2026-08-09T01:50:00Z") }),
      foto({ id: "b", capturadaEm: new Date("2026-08-09T02:05:00Z") }),
    ];

    const paginas = agruparEmBlocos(resolver(midias, plano()), plano()).flatMap(diagramarBloco);

    expect(paginas).toHaveLength(2);
  });
});

describe("duas montagens do mesmo acervo dão o mesmo álbum", () => {
  const acervo = Array.from({ length: 90 }, (_, i) =>
    foto({
      id: `f${String(i).padStart(2, "0")}`,
      sessaoId: `s${i % 9}`,
      lugarId: i % 3 === 0 ? "altar" : "salao",
      reacoes: i % 5,
      capturadaEm: new Date(JANELA.comecaEm.getTime() + i * 420_000),
      ...([EM_PE, EM_PE, DEITADA, QUADRADA][i % 4] ?? EM_PE),
    }),
  );

  /** Embaralhamento com semente: o teste não pode depender de sorte. */
  function embaralhar<T>(itens: readonly T[], semente: number): T[] {
    let estado = semente;
    const proximo = () => {
      estado = (estado * 1103515245 + 12345) % 2147483648;
      return estado / 2147483648;
    };
    const copia = [...itens];
    for (let i = copia.length - 1; i > 0; i -= 1) {
      const j = Math.floor(proximo() * (i + 1));
      const a = copia[i];
      const b = copia[j];
      if (a !== undefined && b !== undefined) {
        copia[i] = b;
        copia[j] = a;
      }
    }
    return copia;
  }

  it("a mesma entrada produz o mesmo álbum", () => {
    expect(montarAlbum(acervo, plano({ tetoDePaginas: 20 }))).toEqual(
      montarAlbum(acervo, plano({ tetoDePaginas: 20 })),
    );
  });

  it("a ordem em que o banco devolveu as linhas não muda o álbum", () => {
    // Álbum que muda a cada abertura é bug. Sem desempate por id, a ordem da
    // consulta vazaria para a diagramação e para quem é descartado.
    const referencia = montarAlbum(acervo, plano({ tetoDePaginas: 20 }));

    for (const semente of [3, 17, 991]) {
      expect(montarAlbum(embaralhar(acervo, semente), plano({ tetoDePaginas: 20 }))).toEqual(
        referencia,
      );
    }
  });

  it("empate de instante desempata por id, não por chegada", () => {
    const mesmoInstante = new Date("2026-08-09T01:00:00Z");
    const midias = [
      foto({ id: "zz", capturadaEm: mesmoInstante }),
      foto({ id: "aa", capturadaEm: mesmoInstante }),
    ];

    expect(resolver(midias, plano()).map((m) => m.id)).toEqual(["aa", "zz"]);
    expect(resolver([...midias].reverse(), plano()).map((m) => m.id)).toEqual(["aa", "zz"]);
  });
});

describe("quando há mais foto que slot", () => {
  it("não descarta nada enquanto cabe", () => {
    const midias = Array.from({ length: 9 }, (_, i) =>
      foto({ id: `f${i}`, capturadaEm: new Date(JANELA.comecaEm.getTime() + i * 60_000) }),
    );

    const album = montarAlbum(midias, plano({ tetoDePaginas: 80 }));

    expect(album.descartadas).toEqual([]);
    expect(album.totalDePaginas).toBeLessThanOrEqual(80);
  });

  it("respeita o teto de páginas", () => {
    const midias = Array.from({ length: 120 }, (_, i) =>
      foto({
        id: `f${String(i).padStart(3, "0")}`,
        sessaoId: `s${i % 6}`,
        capturadaEm: new Date(JANELA.comecaEm.getTime() + i * 200_000),
      }),
    );

    const album = montarAlbum(midias, plano({ tetoDePaginas: 12 }));

    expect(album.totalDePaginas).toBeLessThanOrEqual(12);
    expect(album.descartadas.length).toBeGreaterThan(0);
  });

  it("a rajada sai antes da foto isolada", () => {
    // A oitava foto seguida do mesmo brinde é a que menos falta faz; a foto
    // que ninguém repetiu é insubstituível.
    const base = new Date("2026-08-09T01:00:00Z").getTime();
    const rajada = Array.from({ length: 5 }, (_, i) =>
      foto({ id: `r${i}`, sessaoId: "sA", capturadaEm: new Date(base + i * 30_000) }),
    );
    const isolada = foto({
      id: "isolada",
      sessaoId: "sA",
      capturadaEm: new Date(base + 20 * 60_000),
    });

    const resolvidas = resolver([...rajada, isolada], plano());
    const ordem = ordemNaRajada(resolvidas);

    expect(ordem.get("r0")).toBe(0);
    expect(ordem.get("r4")).toBe(4);
    expect(ordem.get("isolada")).toBe(0);
    expect(ordemDeDescarte(resolvidas)[0]?.id).toBe("r4");
  });

  it("a janela da rajada separa cenas diferentes", () => {
    const base = new Date("2026-08-09T01:00:00Z").getTime();
    const midias = [
      foto({ id: "a", sessaoId: "sA", capturadaEm: new Date(base) }),
      foto({ id: "b", sessaoId: "sA", capturadaEm: new Date(base + JANELA_DE_RAJADA_MS + 1000) }),
    ];

    expect(ordemNaRajada(resolver(midias, plano())).get("b")).toBe(0);
  });

  it("empate de rajada resolve pela reação, e nunca pelo acaso", () => {
    const base = new Date("2026-08-09T01:00:00Z").getTime();
    const midias = [
      foto({ id: "amada", sessaoId: "sA", reacoes: 12, capturadaEm: new Date(base) }),
      foto({ id: "muda", sessaoId: "sB", reacoes: 0, capturadaEm: new Date(base + 60_000) }),
    ];

    expect(ordemDeDescarte(resolver(midias, plano()))[0]?.id).toBe("muda");
  });

  it("todo convidado continua no álbum", () => {
    // Tirar a única foto de alguém apaga essa pessoa da noite.
    const base = new Date("2026-08-09T01:00:00Z").getTime();
    const muitas = Array.from({ length: 6 }, (_, i) =>
      foto({ id: `a${i}`, sessaoId: "sA", capturadaEm: new Date(base + i * 20_000) }),
    );
    const unica = foto({ id: "unica", sessaoId: "sB", capturadaEm: new Date(base + 7 * 20_000) });

    const { mantidas, descartadas } = selecionarParaAlbum(
      resolver([...muitas, unica], plano()),
      plano({ tetoDePaginas: 1 }),
    );

    expect(mantidas.map((m) => m.id)).toContain("unica");
    expect(descartadas.map((m) => m.id)).not.toContain("unica");
    expect(descartadas.length).toBeGreaterThan(0);
  });

  it("o amanhecer não é a faixa que o teto come", () => {
    // É a faixa com menos fotos e a que a spec destaca. Sem a proteção por
    // capítulo, o corte por volume acabaria justamente com ela.
    const base = new Date("2026-08-09T01:00:00Z").getTime();
    const festa = Array.from({ length: 9 }, (_, i) =>
      foto({ id: `f${i}`, sessaoId: `s${i % 3}`, capturadaEm: new Date(base + i * 60_000) }),
    );
    const amanhecer = foto({
      id: "amanhecer",
      sessaoId: "s0",
      capturadaEm: new Date("2026-08-09T08:30:00Z"),
    });

    const album = montarAlbum([...festa, amanhecer], plano({ tetoDePaginas: 2 }));
    const ids = album.capitulos.flatMap((c) => c.paginas.flatMap((p) => p.fotos.map((f) => f.midia.id)));

    expect(album.totalDePaginas).toBeLessThanOrEqual(2);
    expect(ids).toContain("amanhecer");
    expect(album.capitulos.some((c) => c.id === "amanhecer")).toBe(true);
  });

  it("no aperto, a proteção do convidado cede antes da do capítulo", () => {
    // Todo mundo mandou uma foto só: as duas proteções não cabem juntas. O
    // capítulo vazio é buraco na linha do tempo, que é o que o álbum promete
    // organizar; o convidado continua com as fotos dele na galeria.
    const base = new Date("2026-08-09T01:00:00Z").getTime();
    const festa = Array.from({ length: 4 }, (_, i) =>
      foto({ id: `f${i}`, sessaoId: `s${i}`, capturadaEm: new Date(base + i * 60_000) }),
    );
    const amanhecer = foto({
      id: "amanhecer",
      sessaoId: "s9",
      capturadaEm: new Date("2026-08-09T08:30:00Z"),
    });

    const album = montarAlbum([...festa, amanhecer], plano({ tetoDePaginas: 2 }));
    const ids = album.capitulos.flatMap((c) => c.paginas.flatMap((p) => p.fotos.map((f) => f.midia.id)));

    expect(album.totalDePaginas).toBe(2);
    expect(ids).toContain("amanhecer");
    expect(album.descartadas).toEqual(["f0"]);
  });

  it("teto zero esvazia o álbum em vez de girar para sempre", () => {
    const midias = Array.from({ length: 8 }, (_, i) =>
      foto({ id: `f${i}`, sessaoId: `s${i}`, capturadaEm: new Date(JANELA.comecaEm.getTime() + i * 60_000) }),
    );

    const album = montarAlbum(midias, plano({ tetoDePaginas: 0 }));

    expect(album.totalDePaginas).toBe(0);
    expect(album.descartadas).toHaveLength(8);
  });

  it("acervo vazio devolve álbum vazio", () => {
    expect(montarAlbum([], plano())).toEqual({
      capitulos: [],
      totalDePaginas: 0,
      contadores: { fotos: 0, convidados: 0, missoes: 0 },
      descartadas: [],
    });
  });
});

describe("os contadores contam a noite", () => {
  it("conta fotos, convidados e missões", () => {
    const midias = [
      foto({ id: "a", sessaoId: "s1", missaoId: "m1" }),
      foto({ id: "b", sessaoId: "s1", missaoId: "m1" }),
      foto({ id: "c", sessaoId: "s2", missaoId: "m2" }),
      foto({ id: "d", sessaoId: "s2", missaoId: null }),
    ];

    expect(contarAcervo(midias)).toEqual({ fotos: 4, convidados: 2, missoes: 2 });
  });

  it("o teto encolhe o álbum, nunca a noite", () => {
    const midias = Array.from({ length: 40 }, (_, i) =>
      foto({
        id: `f${String(i).padStart(2, "0")}`,
        sessaoId: `s${i % 4}`,
        capturadaEm: new Date(JANELA.comecaEm.getTime() + i * 300_000),
      }),
    );

    const album = montarAlbum(midias, plano({ tetoDePaginas: 3 }));

    expect(album.contadores).toEqual({ fotos: 40, convidados: 4, missoes: 0 });
    expect(album.descartadas.length).toBeGreaterThan(0);
  });
});
