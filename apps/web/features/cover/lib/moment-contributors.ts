export type ContributorCount = { name: string; fotos: number };

const MAX_NOMES = 2;

/**
 * "Ana fotografou esse momento" / "Ana e João fotografaram esse momento" /
 * "Ana, João e +3 fotografaram esse momento" — reforço social leve do P2 do
 * mapa. `counts` já vem ordenado por quem mais contribuiu; nunca mais que
 * `MAX_NOMES` nomes aparecem, o resto vira "+N".
 */
export function contributorsLabel(counts: ContributorCount[]): string | null {
  if (counts.length === 0) return null;

  const nomes = counts.slice(0, MAX_NOMES).map((c) => c.name);
  const extra = counts.length - nomes.length;

  if (counts.length === 1) return `${nomes[0]} fotografou esse momento`;
  if (extra <= 0) return `${nomes.join(" e ")} fotografaram esse momento`;
  return `${nomes.join(", ")} e +${extra} fotografaram esse momento`;
}
