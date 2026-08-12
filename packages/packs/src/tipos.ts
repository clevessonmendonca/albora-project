import type { CamadaTokens } from "@albora/tokens";

/**
 * Dependência unidirecional: `pack → core`, nunca o contrário.
 *
 * O núcleo importa daqui e o guard de packs reprova o CI. É o que garante o
 * teste de sanidade: trocar o pack de um evento muda toda a UI sem tocar uma
 * linha do núcleo.
 */
export type Pack = {
  id: string;
  /** Todo texto de domínio do produto sai daqui. Nada de string em JSX. */
  vocabulario: Record<string, string>;
  missoes: { id: string; chaveTitulo: string; ordem: number }[];
  /**
   * "Onde na festa" — lista fechada, nunca campo livre e nunca GPS (N6.9).
   *
   * Fechada por dois motivos que se somam: alimenta a linha do tempo do álbum
   * sem trabalho de normalização, e não abre a mesma superfície de abuso que
   * um texto livre projetado no telão para 150 pessoas.
   */
  lugares: { id: string; chaveTitulo: string }[];
  /**
   * Os capítulos da noite, na ordem em que ela acontece.
   *
   * Opcional pelo mesmo motivo das chaves de landing: um vertical de
   * fornecedor white-label não tem página de venda própria, e exigir o arco
   * da festa de todo pack acoplaria o núcleo ao funil. Quem cobra é a rota
   * da landing.
   */
  momentos?: { id: string; chaveTitulo: string; chaveDesc: string }[];
  /**
   * O conjunto **fechado** de reações (spec 008).
   *
   * Fechado pelo mesmo motivo de `lugares`: emoji livre é texto livre, e
   * texto livre numa foto projetada para 150 pessoas é a superfície de abuso
   * que o produto recusa em toda parte. Um id fora desta lista não vira linha
   * no banco.
   */
  reacoes?: { id: string; chaveTitulo: string }[];
  tokens?: CamadaTokens;
};

export type ChaveVocabulario = string;

/**
 * Resolve uma chave de vocabulário. Devolve a própria chave se faltar, em vez
 * de string vazia: chave crua na tela é bug visível, tela vazia é bug mudo.
 */
export function texto(pack: Pack, chave: ChaveVocabulario): string {
  return pack.vocabulario[chave] ?? chave;
}

/**
 * As chaves que o núcleo pede a qualquer pack.
 *
 * Missão e lugar **não** entram: um casamento tem altar e um aniversário não,
 * e exigir o mesmo conjunto forçaria packs a inventar lugares que a festa não
 * tem. O que precisa ser igual é o que o núcleo desenha; o resto é o pack
 * descrevendo a própria festa.
 */
export const CHAVES_DO_NUCLEO = [
  "evento.nome",
  "anfitriao.plural",
  "convidado.saudacao",
  "missao.titulo",
  "missao.livre",
  "galeria.minhas",
  "telao.vazio",
  "lugar.pergunta",
] as const;

/**
 * O que a landing pede. Lista separada das chaves do núcleo, e de propósito.
 *
 * Um pack pode existir sem ser vendido sozinho — um vertical de fornecedor
 * white-label não tem página de venda própria. Exigir copy de marketing de
 * todo pack acoplaria o núcleo ao funil. Quem cobra esta lista é a rota da
 * landing, e só ela.
 */
export const CHAVES_DA_LANDING = [
  "landing.rotulo",
  "landing.titulo",
  "landing.titulo.destaque",
  "landing.lede",
  "landing.cta",
  "landing.exemplo.nome",
  "landing.momentos.titulo",
  "landing.momentos.destaque",
  "landing.momentos.lede",
  "landing.telao.titulo",
  "landing.telao.lede",
  "landing.missoes.titulo",
  "landing.missoes.destaque",
  "landing.missoes.lede",
  "landing.planos.titulo",
  "landing.plano.completo",
  "landing.fechamento",
  "landing.fechamento.destaque",
] as const;

/**
 * Vazio quando o pack pode ser vendido.
 *
 * Chave faltando vira a própria chave na tela — `texto()` devolve a chave de
 * propósito. Numa tela interna isso é um bug visível e barato; na landing é
 * `landing.titulo` em corpo 74px na frente de quem ia pagar.
 */
export function problemasDaLanding(pack: Pack): string[] {
  const problemas = CHAVES_DA_LANDING.filter((chave) => !pack.vocabulario[chave]).map(
    (chave) => `falta a chave de landing ${chave}`,
  );

  if (!pack.momentos || pack.momentos.length === 0) {
    problemas.push("falta o arco da festa em momentos");
    return problemas;
  }

  for (const { id, chaveTitulo, chaveDesc } of pack.momentos) {
    for (const chave of [chaveTitulo, chaveDesc]) {
      if (!pack.vocabulario[chave]) {
        problemas.push(`o momento ${id} aponta para ${chave}, que o vocabulário não tem`);
      }
    }
  }

  return problemas;
}

/** Vazio quando o pack está íntegro. Cada string é um defeito de tela. */
export function problemasDoPack(pack: Pack): string[] {
  const problemas: string[] = [];

  for (const chave of CHAVES_DO_NUCLEO) {
    if (!pack.vocabulario[chave]) problemas.push(`falta a chave do núcleo ${chave}`);
  }

  for (const { id, chaveTitulo } of [...pack.missoes, ...pack.lugares]) {
    if (!pack.vocabulario[chaveTitulo]) {
      problemas.push(`${id} aponta para ${chaveTitulo}, que o vocabulário não tem`);
    }
  }

  return problemas;
}

/**
 * Lista fechada, verificada no servidor. O cliente manda um id; se ele não
 * estiver aqui, não vira coluna no banco (N6.10).
 */
export function lugarValido(pack: Pack, id: string | null | undefined): boolean {
  return typeof id === "string" && pack.lugares.some((l) => l.id === id);
}

/**
 * Mesma porta fechada de `lugarValido`, para a reação.
 *
 * Pack sem `reacoes` reprova tudo em vez de liberar tudo: falhar fechado é a
 * regra, e um pack que esqueceu a lista não pode virar campo livre por
 * omissão.
 */
export function reacaoValida(pack: Pack, id: string | null | undefined): boolean {
  return typeof id === "string" && (pack.reacoes ?? []).some((r) => r.id === id);
}
