/** `MetricCard` exige as duas — sem `baseline` honesto, o cartão mostra `—`, nunca inventa tendência. */
export type MetricWithBaseline<T> = { current: T; baseline: T | null };

/**
 * Ruling do controlador (2026-09-05, Onda B): métrica derivada de proxy
 * carrega a própria ressalva até a tela — comentário no código protege
 * quem escreveu a query, não o CEO que decide em cima do número. `value`
 * é o dado calculado normalmente; `approximate`/`approximationBasis` são
 * o que a UI (T3/T7) usa pra renderizar o marcador (`≈` + linha de apoio),
 * em vez de um número que parece exato e não é.
 */
export type ApproximateMetric<T> = {
  value: T;
  approximate: true;
  approximationBasis: string;
};
