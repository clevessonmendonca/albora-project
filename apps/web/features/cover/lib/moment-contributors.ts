export type ContributorCount = { name: string; fotos: number };

const MAX_NOMES = 2;

/** Label de contribuidores do momento (P2): "Ana fotografou…" / "Ana e João…" / "Ana, João e +N…"; max `MAX_NOMES` nomes, o resto vira "+N". */
export function contributorsLabel(counts: ContributorCount[]): string | null {
  if (counts.length === 0) return null;

  const nomes = counts.slice(0, MAX_NOMES).map((c) => c.name);
  const extra = counts.length - nomes.length;

  if (counts.length === 1) return `${nomes[0]} fotografou esse momento`;
  if (extra <= 0) return `${nomes.join(" e ")} fotografaram esse momento`;
  return `${nomes.join(", ")} e +${extra} fotografaram esse momento`;
}
