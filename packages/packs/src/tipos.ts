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
