/**
 * A fila da parede e a escolha de enquadramento (spec 010).
 *
 * Lógica pura, sem DOM e sem rede: é ela que decide **o que** sobe na parede e
 * **como** cabe. Quem desenha é o renderizador; quem busca é o stream com
 * queda para polling. Separado assim porque a regra vermelha da spec precisa
 * de teste, e teste de "nenhum rosto cortado" não se escreve contra um `<img>`.
 */

export type ItemDoTelao = {
  id: string;
  criadaEm: Date;
  /**
   * Quantas vezes já subiu na parede.
   *
   * O decaimento é por **exibição**, não só por tempo: sem isto a foto das 21h
   * com muitas reações fica na parede até as 3h.
   */
  exibicoes: number;
  reacoes: number;
  largura: number;
  altura: number;
};

export type Faixa = "nunca-exibida" | "recente" | "popular";

export type ModeloDeTelao = "polaroide" | "mural" | "colagem" | "ambiente" | "cheio";

export const MODELOS_DE_TELAO: readonly ModeloDeTelao[] = [
  "polaroide",
  "mural",
  "colagem",
  "ambiente",
  "cheio",
];

/** Quanto tempo uma foto conta como "recente". */
export const JANELA_RECENTE_MS = 12 * 60 * 1000;

/** Meia-vida da popularidade no tempo. */
const MEIA_VIDA_MS = 90 * 60 * 1000;

/** Os pesos das três faixas, na ordem em que o sorteio as atravessa. */
export const PESOS: Readonly<Record<Faixa, number>> = {
  "nunca-exibida": 0.5,
  recente: 0.25,
  popular: 0.25,
};

export function ehVertical(item: Pick<ItemDoTelao, "largura" | "altura">): boolean {
  return item.altura > item.largura;
}

/**
 * Os modelos em que esta foto cabe **sem corte**.
 *
 * 🔴 A regra vermelha da spec: três de cada quatro fotos de festa são
 * verticais, e encaixar 9:16 em 16:9 descarta dois terços da imagem pelo topo
 * e pela base — o topo é onde estão as cabeças. `cheio` sangra até a borda, e
 * por isso só aceita foto horizontal. Os outros quatro resolvem o
 * enquadramento sem recortar.
 */
export function modelosPermitidos(
  item: Pick<ItemDoTelao, "largura" | "altura">,
): ModeloDeTelao[] {
  const horizontal = item.largura > item.altura;
  return MODELOS_DE_TELAO.filter((m) => m !== "cheio" || horizontal);
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

/**
 * A popularidade, gasta por exibição e por tempo.
 *
 * As duas quedas se multiplicam de propósito: só tempo deixa a foto muito
 * reagida ocupar a parede a noite toda, e só exibição deixa a foto de 21h
 * voltar para o topo quando a fila esvazia.
 */
export function pontuacaoPopular(item: ItemDoTelao, agora: Date): number {
  const idade = Math.max(0, agora.getTime() - item.criadaEm.getTime());
  const porTempo = Math.pow(0.5, idade / MEIA_VIDA_MS);
  const porExibicao = 1 / (1 + item.exibicoes);
  return item.reacoes * porTempo * porExibicao;
}

function ordenar(faixa: Faixa, itens: ItemDoTelao[], agora: Date): ItemDoTelao[] {
  if (faixa === "nunca-exibida") {
    // A que espera há mais tempo vai primeiro. Ordenar pela mais nova aqui
    // deixaria a foto do começo da festa nunca subir, e a verificação 6 da
    // spec é justamente que toda foto apareça pelo menos uma vez.
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
  /**
   * Quando o modelo da vez é `cheio`, a fila filtra as verticais antes de
   * sortear — em vez de escolher uma foto e depois descobrir que ela não cabe.
   */
  modelo?: ModeloDeTelao;
};

/**
 * A próxima da parede, ou `null` quando não há nada elegível.
 *
 * A faixa sai do sorteio ponderado; se a sorteada estiver vazia, cai para as
 * outras na ordem de prioridade em vez de devolver nada. Uma parede que
 * mostra o vazio porque a faixa da vez esvaziou é pior que uma parede que
 * repete.
 */
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

  const dado = sorteio();
  let acumulado = 0;
  let sorteada: Faixa = "popular";
  for (const faixa of ordem) {
    acumulado += PESOS[faixa];
    if (dado < acumulado) {
      sorteada = faixa;
      break;
    }
  }

  const tentativas = [sorteada, ...ordem.filter((f) => f !== sorteada)];
  for (const faixa of tentativas) {
    const desta = porFaixa[faixa];
    if (desta.length > 0) return ordenar(faixa, desta, agora)[0] ?? null;
  }

  return null;
}

/**
 * O teto do cache local.
 *
 * Sem teto duro a aba cresce durante quatro horas e a TV mata a página no
 * meio da festa — o risco que a própria spec registra. Guardar as mais novas
 * é o certo: com o cabo arrancado, o que a parede tem para mostrar é o fim da
 * festa, não o começo.
 */
export const TETO_DO_CACHE = 50;

export function podarCache(
  itens: readonly ItemDoTelao[],
  teto: number = TETO_DO_CACHE,
): ItemDoTelao[] {
  return [...itens]
    .sort((a, b) => b.criadaEm.getTime() - a.criadaEm.getTime())
    .slice(0, teto);
}
