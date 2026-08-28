export type ItemDoTelao = {
  id: string;
  criadaEm: Date;
  /** Decaimento por exibição, não só por tempo: sem isto a foto mais reagida monopoliza a parede. */
  exibicoes: number;
  reacoes: number;
  largura: number;
  altura: number;
};

export type Faixa = "nunca-exibida" | "recente" | "popular";

export type ModeloDeTelao =
  | "polaroide"
  | "mural"
  | "colagem"
  | "ambiente"
  | "cheio"
  | "carrossel"
  | "dump"
  | "tbt"
  | "grade"
  | "destaque"
  | "mosaico";

export const MODELOS_DE_TELAO: readonly ModeloDeTelao[] = [
  "polaroide",
  "mural",
  "colagem",
  "ambiente",
  "cheio",
  "carrossel",
  "dump",
  "tbt",
  "grade",
  "destaque",
  "mosaico",
];

export type PerfilDoModelo = {
  fotos: number;
  aceitaEmPe: boolean;
  faixaPreferida?: Faixa;
};

export const PERFIS: Readonly<Record<ModeloDeTelao, PerfilDoModelo>> = {
  polaroide: { fotos: 1, aceitaEmPe: true },
  mural: { fotos: 3, aceitaEmPe: true },
  colagem: { fotos: 5, aceitaEmPe: true },
  ambiente: { fotos: 1, aceitaEmPe: true },
  cheio: { fotos: 1, aceitaEmPe: false },
  carrossel: { fotos: 1, aceitaEmPe: true },
  dump: { fotos: 9, aceitaEmPe: true },
  tbt: { fotos: 1, aceitaEmPe: true, faixaPreferida: "popular" },
  grade: { fotos: 4, aceitaEmPe: true },
  destaque: { fotos: 5, aceitaEmPe: true },
  mosaico: { fotos: 5, aceitaEmPe: true },
};

/** Vazio quando escolha é válida; seleção sem nenhum modelo que aceita foto em pé deixaria 3/4 do acervo invisível. */
export function problemasDaEscolha(escolhidos: readonly ModeloDeTelao[]): string[] {
  if (escolhidos.length === 0) return ["nenhum modelo escolhido"];

  if (!escolhidos.some((m) => PERFIS[m].aceitaEmPe)) {
    return [
      "nenhum modelo escolhido aceita foto em pé — três de cada quatro fotos nunca apareceriam",
    ];
  }

  return [];
}

const MODELOS_CONHECIDOS = new Set<string>(MODELOS_DE_TELAO);

function ehModeloDeTelao(valor: unknown): valor is ModeloDeTelao {
  return typeof valor === "string" && MODELOS_CONHECIDOS.has(valor);
}

export function modelosDoRodizio(escolhidos: unknown): readonly ModeloDeTelao[] {
  if (!Array.isArray(escolhidos) || escolhidos.length === 0) {
    return MODELOS_DE_TELAO;
  }

  const filtrados = escolhidos.filter(ehModeloDeTelao);
  if (filtrados.length === 0 || problemasDaEscolha(filtrados).length > 0) {
    return MODELOS_DE_TELAO;
  }

  return filtrados;
}

export const JANELA_RECENTE_MS = 12 * 60 * 1000;

const MEIA_VIDA_MS = 90 * 60 * 1000;

export const PESOS: Readonly<Record<Faixa, number>> = {
  "nunca-exibida": 0.5,
  recente: 0.25,
  popular: 0.25,
};

export function ehVertical(item: Pick<ItemDoTelao, "largura" | "altura">): boolean {
  return item.altura > item.largura;
}

/** Modelos onde a foto cabe sem corte — cheio só aceita horizontal pois sangra até a borda e cortaria cabeças. */
export function modelosPermitidos(
  item: Pick<ItemDoTelao, "largura" | "altura">,
): ModeloDeTelao[] {
  const horizontal = item.largura > item.altura;
  return MODELOS_DE_TELAO.filter((m) => PERFIS[m].aceitaEmPe || horizontal);
}

export function modeloCorta(
  modelo: ModeloDeTelao,
  item: Pick<ItemDoTelao, "largura" | "altura">,
): boolean {
  return !modelosPermitidos(item).includes(modelo);
}

export function faixaDe(item: ItemDoTelao, agora: Date): Faixa {
  if (item.exibicoes === 0) return "nunca-exibida";
  if (agora.getTime() - item.criadaEm.getTime() <= JANELA_RECENTE_MS) return "recente";
  return "popular";
}

/** Multiplicativo de propósito: queda só por tempo deixa a mais reagida na parede toda noite; só por exibição ressuscita fotos antigas. */
export function pontuacaoPopular(item: ItemDoTelao, agora: Date): number {
  const idade = Math.max(0, agora.getTime() - item.criadaEm.getTime());
  const porTempo = Math.pow(0.5, idade / MEIA_VIDA_MS);
  const porExibicao = 1 / (1 + item.exibicoes);
  return item.reacoes * porTempo * porExibicao;
}

function ordenar(faixa: Faixa, itens: ItemDoTelao[], agora: Date): ItemDoTelao[] {
  if (faixa === "nunca-exibida") {
    // A mais antiga vai primeiro — ordenar pela mais nova deixaria a foto do começo da festa nunca subir.
    return [...itens].sort((a, b) => a.criadaEm.getTime() - b.criadaEm.getTime());
  }

  if (faixa === "recente") {
    return [...itens].sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime());
  }

  return [...itens].sort((a, b) => pontuacaoPopular(b, agora) - pontuacaoPopular(a, agora));
}

export type EscolhaDoTelao = {
  agora: Date;
  /** Injetado para o teste ser determinístico. */
  sorteio?: () => number;
  /** Modelo em vigor: filtra inelegíveis antes do sorteio. */
  modelo?: ModeloDeTelao;
};

/** Próxima da parede (null se vazio); faixa sorteada cai para as outras em vez de devolver nada. */
export function proximaDoTelao(
  itens: readonly ItemDoTelao[],
  { agora, sorteio = Math.random, modelo }: EscolhaDoTelao,
): ItemDoTelao | null {
  const elegiveis = modelo ? itens.filter((i) => !modeloCorta(modelo, i)) : [...itens];
  if (elegiveis.length === 0) return null;

  const porFaixa: Record<Faixa, ItemDoTelao[]> = {
    "nunca-exibida": [],
    recente: [],
    popular: [],
  };
  for (const item of elegiveis) porFaixa[faixaDe(item, agora)].push(item);

  const ordem: Faixa[] = ["nunca-exibida", "recente", "popular"];

  // TBT pede a faixa antiga em vez de sortear: um modelo chamado retrospectiva
  // que mostra a foto de cinco minutos atrás não é retrospectiva de nada.
  const preferida = modelo ? PERFIS[modelo].faixaPreferida : undefined;

  let sorteada: Faixa = preferida ?? "popular";

  if (preferida === undefined) {
    const dado = sorteio();
    let acumulado = 0;
    for (const faixa of ordem) {
      acumulado += PESOS[faixa];
      if (dado < acumulado) {
        sorteada = faixa;
        break;
      }
    }
  }

  const tentativas = [sorteada, ...ordem.filter((f) => f !== sorteada)];
  for (const faixa of tentativas) {
    const desta = porFaixa[faixa];
    if (desta.length > 0) return ordenar(faixa, desta, agora)[0] ?? null;
  }

  return null;
}

/** Sem teto duro a aba cresce por horas e a TV mata a página no meio da festa. */
export const TETO_DO_CACHE = 50;

export function podarCache(
  itens: readonly ItemDoTelao[],
  teto: number = TETO_DO_CACHE,
): ItemDoTelao[] {
  return [...itens]
    .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime())
    .slice(0, teto);
}
