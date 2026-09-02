import type { TokenLayer } from "@albora/tokens";

/** Dependência unidirecional: `pack → core`, nunca o contrário — guard reprova o CI; trocar o pack muda toda a UI sem tocar o núcleo. */
export type Pack = {
  id: string;
  /** Todo texto de domínio do produto sai daqui. Nada de string em JSX. */
  vocabulario: Record<string, string>;
  missoes: { id: string; chaveTitulo: string; ordem: number }[];
  /** Perguntas fechadas do confessionário — pack sem lista não mostra a superfície. */
  confessionario?: { id: string; chaveTitulo: string }[];
  /** Lista fechada, nunca campo livre nem GPS (N6.9) — texto livre projetado no telão para 150 pessoas é superfície de abuso. */
  lugares: { id: string; chaveTitulo: string }[];
  /** Opcional — white-label não tem landing própria; exigir o arco de todo pack acoplaria o núcleo ao funil. */
  momentos?: { id: string; chaveTitulo: string; chaveDesc: string }[];
  /** Conjunto fechado (spec 008) — emoji livre projetado para 150 pessoas é a mesma superfície de abuso de `lugares`; id fora da lista não vira linha no banco. */
  reacoes?: { id: string; chaveTitulo: string }[];
  sugereAntes?: string;
  tokens?: TokenLayer;
};

export type PackDefinition = Pack;

export type ChaveVocabulario = string;
export type VocabularyKey = ChaveVocabulario;

/** Chave faltando devolve a própria chave — bug visível e barato, nunca string vazia que passa em silêncio. */
export function resolvePackText(pack: Pack, chave: ChaveVocabulario): string {
  return pack.vocabulario[chave] ?? chave;
}

export const texto = resolvePackText;

/** Missão e lugar ficam fora — um casamento tem altar e um aniversário não; forçar o mesmo conjunto exigiria inventar lugares que a festa não tem. */
export const CORE_VOCABULARY_KEYS = [
  "evento.nome",
  "evento.descricao",
  "anfitriao.plural",
  "convidado.saudacao",
  "missao.titulo",
  "missao.livre",
  "galeria.minhas",
  "telao.vazio",
  "lugar.pergunta",
  "recado.rotulo",
] as const;

export const CHAVES_DO_NUCLEO = CORE_VOCABULARY_KEYS;

/** Separada do núcleo de propósito — pack white-label não tem landing própria; exigir copy de marketing de todo pack acoplaria o núcleo ao funil. */
export const LANDING_VOCABULARY_KEYS = [
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
  "landing.veteran.titulo",
  "landing.veteran.lede",
] as const;

export const CHAVES_DA_LANDING = LANDING_VOCABULARY_KEYS;

export function temLandingPropria(pack: Pack): boolean {
  if (pack.momentos && pack.momentos.length > 0) return true;
  return LANDING_VOCABULARY_KEYS.some((chave) => Boolean(pack.vocabulario[chave]));
}

export const hasOwnLanding = temLandingPropria;

/** Chave faltando na landing vira a própria chave em corpo 74px na frente de quem ia pagar. */
export function landingProblems(pack: Pack): string[] {
  const problemas = LANDING_VOCABULARY_KEYS.filter((chave) => !pack.vocabulario[chave]).map(
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

export const problemasDaLanding = landingProblems;

/** Vazio quando o pack está íntegro. Cada string é um defeito de tela. */
export function packProblems(pack: Pack): string[] {
  const problemas: string[] = [];

  for (const chave of CORE_VOCABULARY_KEYS) {
    if (!pack.vocabulario[chave]) problemas.push(`falta a chave do núcleo ${chave}`);
  }

  for (const { id, chaveTitulo } of [
    ...pack.missoes,
    ...pack.lugares,
    ...(pack.confessionario ?? []),
  ]) {
    if (!pack.vocabulario[chaveTitulo]) {
      problemas.push(`${id} aponta para ${chaveTitulo}, que o vocabulário não tem`);
    }
  }

  return problemas;
}

export const problemasDoPack = packProblems;

/** Lista fechada verificada no servidor — id fora daqui não vira coluna no banco (N6.10). */
export function isValidPlace(pack: Pack, id: string | null | undefined): boolean {
  return typeof id === "string" && pack.lugares.some((l) => l.id === id);
}

export const lugarValido = isValidPlace;

/** Pack sem `reacoes` reprova tudo — falhar fechado é a regra; omissão não vira campo livre. */
export function isValidReaction(pack: Pack, id: string | null | undefined): boolean {
  return typeof id === "string" && (pack.reacoes ?? []).some((r) => r.id === id);
}

export const reacaoValida = isValidReaction;

/** Valida chave de vocabulário (`missao.*`), não o id interno — inventar título quebraria o resolvedor e o teste de sanidade. */
export function isValidMissionKey(pack: Pack, key: string | null | undefined): boolean {
  return typeof key === "string" && pack.missoes.some((m) => m.chaveTitulo === key);
}

export const missaoValida = isValidMissionKey;

/** Pergunta do confessionário — mesma porta fechada das missões. */
export function isValidConfessionPrompt(pack: Pack, key: string | null | undefined): boolean {
  return (
    typeof key === "string" && (pack.confessionario ?? []).some((p) => p.chaveTitulo === key)
  );
}

export const confessionarioValido = isValidConfessionPrompt;
