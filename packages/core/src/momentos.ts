import { CAPITULO_CONFESSIONARIO, CAPITULO_SEM_HORA, CAPITULO_UNICO } from "./album/types";

export type MomentoDoEvento = { id: string; titulo: string };

export const MOMENTOS_MAXIMO = 12;
export const MOMENTO_TITULO_MAXIMO = 40;

const ID_VALIDO = /^[a-z0-9][a-z0-9-]{0,31}$/;
const RESERVADOS: ReadonlySet<string> = new Set([
  CAPITULO_SEM_HORA,
  CAPITULO_UNICO,
  CAPITULO_CONFESSIONARIO,
]);

export function sanearTituloDeMomento(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor
    .replace(/[\p{Cc}<>]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (limpo.length === 0 || limpo.length > MOMENTO_TITULO_MAXIMO) return null;
  return limpo;
}

function chaveDeComparacao(titulo: string): string {
  return titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function novoIdDeMomento(existentes: Iterable<string>): string {
  const usados = new Set(existentes);
  for (;;) {
    const id = `m-${Math.random().toString(36).slice(2, 8).padEnd(6, "0")}`;
    if (!usados.has(id)) return id;
  }
}

export type ResultadoMomentos =
  | { ok: true; momentos: MomentoDoEvento[] }
  | { ok: false; motivo: string };

export function validarMomentos(valor: unknown): ResultadoMomentos {
  if (!Array.isArray(valor)) return { ok: false, motivo: "Momentos inválidos" };
  if (valor.length === 0) return { ok: false, motivo: "Mantenha ao menos um momento" };
  if (valor.length > MOMENTOS_MAXIMO) {
    return { ok: false, motivo: `No máximo ${MOMENTOS_MAXIMO} momentos` };
  }
  const ids = new Set<string>();
  const titulos = new Set<string>();
  const momentos: MomentoDoEvento[] = [];
  for (const item of valor) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      return { ok: false, motivo: "Momentos inválidos" };
    }
    const { id, titulo } = item as Record<string, unknown>;
    if (typeof id !== "string" || !ID_VALIDO.test(id) || RESERVADOS.has(id)) {
      return { ok: false, motivo: "Momentos inválidos" };
    }
    const limpo = sanearTituloDeMomento(titulo);
    if (limpo === null) {
      return { ok: false, motivo: `O nome do momento tem de 1 a ${MOMENTO_TITULO_MAXIMO} letras` };
    }
    const chave = chaveDeComparacao(limpo);
    if (ids.has(id) || titulos.has(chave)) {
      return { ok: false, motivo: "Dois momentos com o mesmo nome" };
    }
    ids.add(id);
    titulos.add(chave);
    momentos.push({ id, titulo: limpo });
  }
  return { ok: true, momentos };
}

export function momentosEditadosDoEvento(
  tokens: Record<string, unknown> | null | undefined,
): MomentoDoEvento[] | null {
  const r = validarMomentos(tokens?.momentos);
  return r.ok ? r.momentos : null;
}

/** Sem edição válida no evento, vale o arco do pack; ids do pack são preservados na edição para manter missão e capítulo ligados. */
export function momentosDoEvento(
  padrao: readonly MomentoDoEvento[],
  tokens: Record<string, unknown> | null | undefined,
): MomentoDoEvento[] {
  return momentosEditadosDoEvento(tokens) ?? padrao.map((m) => ({ ...m }));
}

export function normalizarIdentityTokensMomentos(
  tokens: Record<string, unknown>,
): { ok: true; tokens: Record<string, unknown> } | { ok: false; motivo: string } {
  if (tokens.momentos === undefined) return { ok: true, tokens };
  const r = validarMomentos(tokens.momentos);
  if (!r.ok) return r;
  return { ok: true, tokens: { ...tokens, momentos: r.momentos } };
}

export function momentosIguais(a: readonly MomentoDoEvento[], b: readonly MomentoDoEvento[]): boolean {
  return a.length === b.length && a.every((m, i) => m.id === b[i]!.id && m.titulo === b[i]!.titulo);
}
