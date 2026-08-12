/**
 * O álbum da noite (spec 016).
 *
 * Lógica pura: decide **em que capítulo** cada foto cai, **em que slot** ela
 * cabe sem corte e **quais** ficam de fora quando o acervo passa do teto de
 * páginas. Quem desenha é o renderizador; aqui não há pixel, nem DOM, nem
 * posicionamento livre — um layout é um conjunto de slots com proporção
 * declarada, e o layout escolhido é o contrato que a folha de estilo desenha.
 *
 * A unidade é a hora, não o dia, e a hora é a **do fuso do evento**. Ancorar no
 * fuso do aparelho é o risco que a própria spec registra: um convidado com o
 * relógio em outro fuso jogaria a foto da meia-noite na faixa das 21h.
 */

import { ehVertical } from "./telao";

export type MidiaDoAlbum = {
  id: string;
  sessaoId: string;
  /**
   * O `taken_at`, preservado no `confirm` **antes** de o EXIF ser descartado.
   * É o único campo do EXIF que sobrevive, e por isso pode faltar.
   */
  capturadaEm: Date | null;
  /** O instante do `confirm`, medido no relógio do servidor. */
  recebidaEm: Date;
  largura: number;
  altura: number;
  lugarId: string | null;
  missaoId: string | null;
  reacoes: number;
};

export type JanelaDoEvento = {
  comecaEm: Date;
  terminaEm: Date;
  /** Deslocamento do fuso do evento em minutos (Brasília = -180). */
  offsetMinutos: number;
};

/**
 * A folga que a janela dá nas duas pontas.
 *
 * Festa nenhuma acaba na hora marcada, e a faixa que a spec mais destaca é
 * justamente a que acontece depois do fim previsto. Sem folga, o amanhecer
 * inteiro seria classificado como hora não confiável e sairia da linha do
 * tempo.
 */
export const FOLGA_DA_JANELA_MS = 3 * 60 * 60 * 1000;

/** Capítulo de quem não tem hora confiável. Existe para nada sumir. */
export const CAPITULO_SEM_HORA = "sem-hora";

/** Capítulo usado quando o plano não declara nenhum. */
export const CAPITULO_UNICO = "a-noite";

export const HORAS_DO_AMANHECER: readonly number[] = [5, 6, 7];

export type CapituloPlanejado = {
  id: string;
  /** Instante em que o capítulo abre. Ele vai até o próximo começar. */
  comecaEm: Date;
};

export type PlanoDoAlbum = {
  janela: JanelaDoEvento;
  /** Os capítulos da noite. Vazio cai no capítulo único. */
  capitulos: readonly CapituloPlanejado[];
  tetoDePaginas: number;
};

export const TETO_DE_PAGINAS_PADRAO = 80;

/* ── hora, fuso e capítulo ──────────────────────────────────────────── */

function ehInstanteValido(em: Date | null): em is Date {
  return em !== null && !Number.isNaN(em.getTime());
}

function dentroDaJanela(em: Date, janela: JanelaDoEvento): boolean {
  return (
    em.getTime() >= janela.comecaEm.getTime() - FOLGA_DA_JANELA_MS &&
    em.getTime() <= janela.terminaEm.getTime() + FOLGA_DA_JANELA_MS
  );
}

export type Instante = { em: Date; confiavel: boolean };

/**
 * O instante da foto, e se dá para confiar nele.
 *
 * Ordem da spec: `taken_at` primeiro, `created_at` como queda. Um instante fora
 * da janela do evento é relógio de aparelho errado, não memória de outra festa
 * — vale mais o `created_at` do servidor. Quando nenhum dos dois é plausível a
 * foto **não some**: ela sai sem hora e cai no capítulo próprio.
 */
export function instanteDe(midia: MidiaDoAlbum, janela: JanelaDoEvento): Instante {
  const capturada = ehInstanteValido(midia.capturadaEm) ? midia.capturadaEm : null;
  if (capturada && dentroDaJanela(capturada, janela)) return { em: capturada, confiavel: true };

  const recebida = ehInstanteValido(midia.recebidaEm) ? midia.recebidaEm : null;
  if (recebida && dentroDaJanela(recebida, janela)) return { em: recebida, confiavel: true };

  return { em: recebida ?? capturada ?? janela.comecaEm, confiavel: false };
}

export function horaNoEvento(em: Date, offsetMinutos: number): number {
  const local = new Date(em.getTime() + offsetMinutos * 60_000);
  return local.getUTCHours();
}

/**
 * O início da hora, como instante absoluto.
 *
 * A chave do grupo é o instante, e não o número da hora: uma festa que passa da
 * meia-noite tem 23h de sábado e 23h de domingo, e juntar as duas embaralharia
 * a noite inteira.
 */
export function inicioDaHoraNoEvento(em: Date, offsetMinutos: number): Date {
  const deslocado = em.getTime() + offsetMinutos * 60_000;
  const truncado = Math.floor(deslocado / 3_600_000) * 3_600_000;
  return new Date(truncado - offsetMinutos * 60_000);
}

export function ehAmanhecer(em: Date, offsetMinutos: number): boolean {
  return HORAS_DO_AMANHECER.includes(horaNoEvento(em, offsetMinutos));
}

export function capituloDe(em: Date, capitulos: readonly CapituloPlanejado[]): string {
  const ordenados = [...capitulos].sort((a, b) => a.comecaEm.getTime() - b.comecaEm.getTime());
  const primeiro = ordenados[0];
  if (!primeiro) return CAPITULO_UNICO;

  let atual = primeiro.id;
  for (const capitulo of ordenados) {
    if (capitulo.comecaEm.getTime() <= em.getTime()) atual = capitulo.id;
  }
  return atual;
}

export type MidiaResolvida = MidiaDoAlbum & {
  em: Date;
  horaConfiavel: boolean;
  capituloId: string;
  /** `null` quando a hora não é confiável — não se inventa faixa. */
  inicioDaHora: Date | null;
  hora: number | null;
  amanhecer: boolean;
};

function compararCronologicamente(a: MidiaResolvida, b: MidiaResolvida): number {
  const porTempo = a.em.getTime() - b.em.getTime();
  if (porTempo !== 0) return porTempo;
  // Empate de instante desempata pelo id, e não pela ordem de chegada da
  // consulta: duas montagens do mesmo acervo têm de produzir o mesmo álbum.
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function resolver(
  midias: readonly MidiaDoAlbum[],
  plano: PlanoDoAlbum,
): MidiaResolvida[] {
  const { janela, capitulos } = plano;

  return midias
    .map((midia) => {
      const { em, confiavel } = instanteDe(midia, janela);
      return {
        ...midia,
        em,
        horaConfiavel: confiavel,
        capituloId: confiavel ? capituloDe(em, capitulos) : CAPITULO_SEM_HORA,
        inicioDaHora: confiavel ? inicioDaHoraNoEvento(em, janela.offsetMinutos) : null,
        hora: confiavel ? horaNoEvento(em, janela.offsetMinutos) : null,
        amanhecer: confiavel && ehAmanhecer(em, janela.offsetMinutos),
      };
    })
    .sort(compararCronologicamente);
}

/* ── slots ──────────────────────────────────────────────────────────── */

export type Proporcao = "retrato" | "paisagem" | "quadrado";

export type Slot = {
  id: string;
  proporcao: Proporcao;
  /** Fração da página. Não há x nem y: quem posiciona é o layout, não a foto. */
  fracao: number;
};

export type Layout = { id: string; slots: readonly Slot[] };

export function proporcaoDe(midia: Pick<MidiaDoAlbum, "largura" | "altura">): Proporcao {
  if (ehVertical(midia)) return "retrato";
  return midia.largura > midia.altura ? "paisagem" : "quadrado";
}

/**
 * 🔴 A regra vermelha, no álbum: um slot só aceita a proporção que ele é.
 *
 * Uma foto em pé num slot deitado perde o topo, que é onde estão as cabeças —
 * a mesma razão pela qual `cheio` recusa vertical no telão. A recíproca também
 * corta, e a quadrada não vira nenhuma das duas sem perder lateral ou topo.
 * Por isso a igualdade, e não uma tolerância.
 */
export function slotAceita(
  slot: Slot,
  midia: Pick<MidiaDoAlbum, "largura" | "altura">,
): boolean {
  return slot.proporcao === proporcaoDe(midia);
}

export function slotCorta(
  slot: Slot,
  midia: Pick<MidiaDoAlbum, "largura" | "altura">,
): boolean {
  return !slotAceita(slot, midia);
}

function slots(proporcao: Proporcao, quantos: number): Slot[] {
  const ids = ["a", "b", "c", "d"];
  return Array.from({ length: quantos }, (_, i) => ({
    id: ids[i] ?? `s${i}`,
    proporcao,
    fracao: 1 / quantos,
  }));
}

/**
 * O catálogo fechado de layouts. A ordem é a preferência no empate.
 *
 * Toda proporção tem um layout de uma foto só, e é isso que garante que
 * nenhuma foto fique sem página por não ter companhia da mesma forma.
 */
export const LAYOUTS: readonly Layout[] = [
  { id: "tira-retrato", slots: slots("retrato", 3) },
  { id: "quadrante", slots: slots("quadrado", 4) },
  {
    id: "paisagem-e-par",
    slots: [
      { id: "a", proporcao: "paisagem", fracao: 0.5 },
      { id: "b", proporcao: "retrato", fracao: 0.25 },
      { id: "c", proporcao: "retrato", fracao: 0.25 },
    ],
  },
  { id: "par-retrato", slots: slots("retrato", 2) },
  { id: "par-paisagem", slots: slots("paisagem", 2) },
  { id: "par-quadrado", slots: slots("quadrado", 2) },
  { id: "cheia-paisagem", slots: slots("paisagem", 1) },
  { id: "cheia-retrato", slots: slots("retrato", 1) },
  { id: "cheia-quadrado", slots: slots("quadrado", 1) },
];

const LAYOUT_DE_UMA: Readonly<Record<Proporcao, Layout>> = {
  paisagem: { id: "cheia-paisagem", slots: slots("paisagem", 1) },
  retrato: { id: "cheia-retrato", slots: slots("retrato", 1) },
  quadrado: { id: "cheia-quadrado", slots: slots("quadrado", 1) },
};

const MAIOR_LAYOUT = LAYOUTS.reduce((n, l) => Math.max(n, l.slots.length), 1);

export function layoutsQueCabem(
  prefixo: readonly Pick<MidiaDoAlbum, "largura" | "altura">[],
): Layout[] {
  return LAYOUTS.filter(
    (layout) =>
      layout.slots.length <= prefixo.length &&
      layout.slots.every((slot, i) => {
        const midia = prefixo[i];
        return midia !== undefined && slotAceita(slot, midia);
      }),
  );
}

/**
 * O layout mais denso que casa com o começo da fila, sem reordenar nada.
 *
 * A ordem cronológica dentro da página é inegociável, então o layout se adapta
 * à sequência — nunca a sequência ao layout. Empate de densidade resolve pela
 * ordem de declaração do catálogo, que é o que torna a montagem determinística.
 */
export function escolherLayout(
  prefixo: readonly Pick<MidiaDoAlbum, "largura" | "altura">[],
): Layout | null {
  let melhor: Layout | null = null;
  for (const layout of layoutsQueCabem(prefixo)) {
    if (!melhor || layout.slots.length > melhor.slots.length) melhor = layout;
  }
  return melhor;
}

/* ── blocos e páginas ───────────────────────────────────────────────── */

export type Bloco = {
  capituloId: string;
  inicioDaHora: Date | null;
  hora: number | null;
  amanhecer: boolean;
  lugarId: string | null;
  midias: MidiaResolvida[];
};

/**
 * Capítulo, hora e lugar definem o bloco — e o bloco é a unidade de página.
 *
 * Uma página que mistura o altar com a pista lê como erro de montagem, e uma
 * que mistura 21h com 3h desfaz a única coisa que o álbum promete organizar.
 */
export function agruparEmBlocos(
  resolvidas: readonly MidiaResolvida[],
  plano: PlanoDoAlbum,
): Bloco[] {
  const porChave = new Map<string, Bloco>();

  for (const midia of resolvidas) {
    const chave = [
      midia.capituloId,
      midia.inicioDaHora?.getTime() ?? "sem-hora",
      midia.lugarId ?? "sem-lugar",
    ].join("|");

    const existente = porChave.get(chave);
    if (existente) {
      existente.midias.push(midia);
      continue;
    }

    porChave.set(chave, {
      capituloId: midia.capituloId,
      inicioDaHora: midia.inicioDaHora,
      hora: midia.hora,
      amanhecer: midia.amanhecer,
      lugarId: midia.lugarId,
      midias: [midia],
    });
  }

  const ordemDoCapitulo = new Map<string, number>();
  plano.capitulos.forEach((c, i) => ordemDoCapitulo.set(c.id, i));
  ordemDoCapitulo.set(CAPITULO_UNICO, ordemDoCapitulo.get(CAPITULO_UNICO) ?? -1);
  // O sem-hora fecha o álbum: encaixá-lo no meio quebraria o arco da noite,
  // que é a única coisa que a linha do tempo tem para contar.
  const FIM = Number.MAX_SAFE_INTEGER;

  return [...porChave.values()].sort((a, b) => {
    const ia = a.capituloId === CAPITULO_SEM_HORA ? FIM : ordemDoCapitulo.get(a.capituloId) ?? 0;
    const ib = b.capituloId === CAPITULO_SEM_HORA ? FIM : ordemDoCapitulo.get(b.capituloId) ?? 0;
    if (ia !== ib) return ia - ib;

    const ta = a.inicioDaHora?.getTime() ?? 0;
    const tb = b.inicioDaHora?.getTime() ?? 0;
    if (ta !== tb) return ta - tb;

    const la = a.lugarId ?? "";
    const lb = b.lugarId ?? "";
    return la < lb ? -1 : la > lb ? 1 : 0;
  });
}

export type FotoNaPagina = { slot: Slot; midia: MidiaResolvida };

export type Pagina = {
  capituloId: string;
  layoutId: string;
  inicioDaHora: Date | null;
  hora: number | null;
  amanhecer: boolean;
  lugarId: string | null;
  fotos: FotoNaPagina[];
};

export function diagramarBloco(bloco: Bloco): Pagina[] {
  const paginas: Pagina[] = [];
  let i = 0;

  while (i < bloco.midias.length) {
    const prefixo = bloco.midias.slice(i, i + MAIOR_LAYOUT);
    const primeira = prefixo[0];
    if (!primeira) break;

    const layout = escolherLayout(prefixo) ?? LAYOUT_DE_UMA[proporcaoDe(primeira)];

    const fotos: FotoNaPagina[] = [];
    for (const [k, slot] of layout.slots.entries()) {
      const midia = prefixo[k];
      if (midia) fotos.push({ slot, midia });
    }

    paginas.push({
      capituloId: bloco.capituloId,
      layoutId: layout.id,
      inicioDaHora: bloco.inicioDaHora,
      hora: bloco.hora,
      amanhecer: bloco.amanhecer,
      lugarId: bloco.lugarId,
      fotos,
    });

    i += fotos.length;
  }

  return paginas;
}

/* ── seleção ────────────────────────────────────────────────────────── */

/** Intervalo abaixo do qual duas fotos do mesmo convidado são a mesma cena. */
export const JANELA_DE_RAJADA_MS = 90 * 1000;

/**
 * Quantas fotos a mesma pessoa já tinha feito da mesma cena antes desta.
 *
 * É a única medida de redundância que o núcleo tem sem olhar o pixel, e é
 * honesta: a oitava foto seguida do mesmo brinde é a que menos falta faz.
 */
export function ordemNaRajada(resolvidas: readonly MidiaResolvida[]): Map<string, number> {
  const porSessao = new Map<string, MidiaResolvida[]>();
  for (const midia of resolvidas) {
    const lista = porSessao.get(midia.sessaoId);
    if (lista) lista.push(midia);
    else porSessao.set(midia.sessaoId, [midia]);
  }

  const ordem = new Map<string, number>();
  for (const lista of porSessao.values()) {
    const cronologica = [...lista].sort(compararCronologicamente);
    let indice = 0;
    let anterior: MidiaResolvida | null = null;
    for (const midia of cronologica) {
      if (anterior && midia.em.getTime() - anterior.em.getTime() <= JANELA_DE_RAJADA_MS) {
        indice += 1;
      } else {
        indice = 0;
      }
      ordem.set(midia.id, indice);
      anterior = midia;
    }
  }

  return ordem;
}

/**
 * A fila do descarte, da primeira a sair para a última.
 *
 * Descartar foto de convidado é decisão séria, então a ordem não é gosto: sai
 * antes a que repete uma cena que já está no álbum, depois a que ninguém
 * reagiu. O id fecha o desempate para que a mesma foto saia nas duas
 * montagens.
 */
export function ordemDeDescarte(resolvidas: readonly MidiaResolvida[]): MidiaResolvida[] {
  const rajada = ordemNaRajada(resolvidas);

  return [...resolvidas].sort((a, b) => {
    const ra = rajada.get(a.id) ?? 0;
    const rb = rajada.get(b.id) ?? 0;
    if (ra !== rb) return rb - ra;
    if (a.reacoes !== b.reacoes) return a.reacoes - b.reacoes;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export type Selecao = { mantidas: MidiaResolvida[]; descartadas: MidiaResolvida[] };

/**
 * Corta até caber no teto de páginas, protegendo o que não pode sumir.
 *
 * Duas proteções: **todo convidado fica no álbum** — tirar a única foto de
 * alguém apaga essa pessoa da noite — e **todo capítulo sobrevive**, senão o
 * teto come justamente o amanhecer, que é a faixa que a spec destaca e a que
 * tem menos fotos.
 *
 * Quando só sobram fotos protegidas o teto ainda vale — ele é limite físico, e
 * não preferência —, e aí a proteção do convidado cede antes da do capítulo: um
 * capítulo vazio é um buraco na linha do tempo, que é a única coisa que o álbum
 * promete organizar, enquanto o convidado continua com as fotos dele na galeria.
 */
export function selecionarParaAlbum(
  resolvidas: readonly MidiaResolvida[],
  plano: PlanoDoAlbum,
): Selecao {
  const blocos = agruparEmBlocos(resolvidas, plano);
  const fora = new Set<string>();

  const contarPaginas = (): number =>
    blocos.reduce(
      (total, bloco) =>
        total +
        diagramarBloco({ ...bloco, midias: bloco.midias.filter((m) => !fora.has(m.id)) }).length,
      0,
    );

  const porSessao = new Map<string, number>();
  const porCapitulo = new Map<string, number>();
  for (const midia of resolvidas) {
    porSessao.set(midia.sessaoId, (porSessao.get(midia.sessaoId) ?? 0) + 1);
    porCapitulo.set(midia.capituloId, (porCapitulo.get(midia.capituloId) ?? 0) + 1);
  }

  const fila = ordemDeDescarte(resolvidas);
  const descartadas: MidiaResolvida[] = [];

  while (contarPaginas() > plano.tetoDePaginas) {
    const disponivel = (m: MidiaResolvida): boolean => !fora.has(m.id);
    const ultimaDoConvidado = (m: MidiaResolvida): boolean =>
      (porSessao.get(m.sessaoId) ?? 0) <= 1;
    const ultimaDoCapitulo = (m: MidiaResolvida): boolean =>
      (porCapitulo.get(m.capituloId) ?? 0) <= 1;

    const vitima =
      fila.find((m) => disponivel(m) && !ultimaDoConvidado(m) && !ultimaDoCapitulo(m)) ??
      fila.find((m) => disponivel(m) && !ultimaDoCapitulo(m)) ??
      fila.find(disponivel);
    if (!vitima) break;

    fora.add(vitima.id);
    descartadas.push(vitima);
    porSessao.set(vitima.sessaoId, (porSessao.get(vitima.sessaoId) ?? 1) - 1);
    porCapitulo.set(vitima.capituloId, (porCapitulo.get(vitima.capituloId) ?? 1) - 1);
  }

  return {
    mantidas: resolvidas.filter((m) => !fora.has(m.id)),
    descartadas,
  };
}

/* ── montagem ───────────────────────────────────────────────────────── */

export type Contadores = { fotos: number; convidados: number; missoes: number };

/**
 * Os contadores contam a **noite**, não o álbum.
 *
 * O acervo é o que aconteceu; o álbum é o recorte que coube. Contar o recorte
 * faria o número encolher toda vez que o teto apertasse.
 */
export function contarAcervo(midias: readonly MidiaDoAlbum[]): Contadores {
  return {
    fotos: midias.length,
    convidados: new Set(midias.map((m) => m.sessaoId)).size,
    missoes: new Set(midias.map((m) => m.missaoId).filter((id): id is string => id !== null)).size,
  };
}

export type CapituloDoAlbum = {
  id: string;
  comecaEm: Date | null;
  paginas: Pagina[];
};

export type Album = {
  capitulos: CapituloDoAlbum[];
  totalDePaginas: number;
  contadores: Contadores;
  /** Ids do que não coube. A chamadora decide se conta isso ao anfitrião. */
  descartadas: string[];
};

/**
 * Duas montagens do mesmo acervo produzem o mesmo álbum.
 *
 * Nada aqui depende de sorteio, de relógio ou da ordem em que o banco devolveu
 * as linhas — álbum que muda a cada abertura é bug, e é o que os testes
 * cobram. Capítulo vazio não entra: banda vazia no disco de navegação é um
 * clique que não leva a lugar nenhum.
 */
export function montarAlbum(midias: readonly MidiaDoAlbum[], plano: PlanoDoAlbum): Album {
  const resolvidas = resolver(midias, plano);
  const { mantidas, descartadas } = selecionarParaAlbum(resolvidas, plano);
  const paginas = agruparEmBlocos(mantidas, plano).flatMap(diagramarBloco);

  const comecoDoCapitulo = new Map<string, Date>();
  for (const capitulo of plano.capitulos) comecoDoCapitulo.set(capitulo.id, capitulo.comecaEm);

  const capitulos: CapituloDoAlbum[] = [];
  for (const pagina of paginas) {
    const ultimo = capitulos[capitulos.length - 1];
    if (ultimo && ultimo.id === pagina.capituloId) {
      ultimo.paginas.push(pagina);
      continue;
    }
    capitulos.push({
      id: pagina.capituloId,
      comecaEm: comecoDoCapitulo.get(pagina.capituloId) ?? null,
      paginas: [pagina],
    });
  }

  return {
    capitulos,
    totalDePaginas: paginas.length,
    contadores: contarAcervo(midias),
    descartadas: descartadas.map((m) => m.id),
  };
}
