export const MONOGRAMA_MAXIMO = 8;

const LIGACOES = new Set(["e", "de", "da", "do", "das", "dos", "and", "of", "the"]);

export function iniciaisDoNome(nome: string | null | undefined): string[] {
  if (!nome) return [];
  return nome
    .split(/[\s&+/,]+/u)
    .map((p) => p.trim())
    .filter((p) => p.length > 0 && !LIGACOES.has(p.toLocaleLowerCase("pt-BR")))
    .map((p) => (Array.from(p).find((c) => /\p{L}|\p{N}/u.test(c)) ?? "").toLocaleUpperCase("pt-BR"))
    .filter((c) => c.length > 0)
    .slice(0, 2);
}

export type OpcaoDeMonograma = { id: "e-comercial" | "junto" | "mais" | "sem"; valor: string; rotulo: string };

export function opcoesDeMonograma(nome: string | null | undefined): OpcaoDeMonograma[] {
  const i = iniciaisDoNome(nome);
  const opcoes: OpcaoDeMonograma[] = [];
  if (i.length === 2) {
    opcoes.push(
      { id: "e-comercial", valor: `${i[0]}&${i[1]}`, rotulo: `${i[0]}&${i[1]}` },
      { id: "junto", valor: `${i[0]}${i[1]}`, rotulo: `${i[0]}${i[1]}` },
      { id: "mais", valor: `${i[0]} + ${i[1]}`, rotulo: `${i[0]} + ${i[1]}` },
    );
  } else if (i.length === 1) {
    opcoes.push({ id: "junto", valor: i[0]!, rotulo: i[0]! });
  }
  opcoes.push({ id: "sem", valor: "", rotulo: "Sem monograma" });
  return opcoes;
}

export function sanearMonograma(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor
    .replace(/[\p{Cc}<>]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (limpo.length > MONOGRAMA_MAXIMO) return null;
  return limpo;
}

export function validarIdentityTokensMonograma(
  tokens: Record<string, unknown>,
): { ok: true; tokens: Record<string, unknown> } | { ok: false } {
  if (tokens.monograma === undefined) return { ok: true, tokens };
  const m = sanearMonograma(tokens.monograma);
  if (m === null) return { ok: false };
  return { ok: true, tokens: { ...tokens, monograma: m } };
}
