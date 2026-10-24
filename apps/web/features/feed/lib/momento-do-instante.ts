export type MomentoDoFeed = { id: string; titulo: string; comecaEm: string };

export function momentoDoInstante(
  momentos: readonly MomentoDoFeed[],
  criadaEm: string | undefined,
): string | null {
  if (!criadaEm || momentos.length === 0) return null;
  const t = Date.parse(criadaEm);
  if (Number.isNaN(t)) return null;

  let atual: MomentoDoFeed | null = null;
  let atualEm = Number.NEGATIVE_INFINITY;
  for (const m of momentos) {
    const em = Date.parse(m.comecaEm);
    if (Number.isNaN(em) || em > t) continue;
    if (em >= atualEm) {
      atual = m;
      atualEm = em;
    }
  }
  return atual?.titulo ?? null;
}
