export type MetricCardProps = {
  /** Rótulo curto do indicador (ex.: "Uploads hoje"). */
  rotulo: string;
  /** Valor atual já formatado para exibição (ex.: "1.284", "42%"). */
  valor: string;
  /** Mesmo valor atual, em número puro — usado só para calcular o delta. */
  valorNumerico: number;
  /** Valor numérico do período anterior. Ausente = sem base de comparação honesta. */
  anterior?: number;
  /**
   * Direção que é boa para este indicador — nunca inferida do sinal do
   * delta. Tickets abertos subindo é ruim; H1 subindo é bom: quem decide é
   * quem chama o componente, não o sinal.
   */
  bomQuando: "sobe" | "desce";
  /** Janela do período atual, em texto (ex.: "Últimos 7 dias"). */
  janela: string;
};

function formatarNumero(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

/**
 * Cartão de métrica: rótulo, valor, delta em pílula (seta + sinal, não só
 * cor) e uma linha de base em texto com a janela e o valor anterior — sem
 * ela, "+15%" não diz se saímos de 4 para 5 ou de 4.000 para 4.600.
 *
 * Sem período anterior, o delta vira "—" e a base avisa a ausência — nunca
 * inventa tendência a partir de dois pontos.
 */
export function MetricCard({ rotulo, valor, valorNumerico, anterior, bomQuando, janela }: MetricCardProps) {
  const temBase = typeof anterior === "number";
  const diferenca = temBase ? valorNumerico - anterior : null;
  const percentual = temBase && anterior !== 0 ? ((diferenca as number) / Math.abs(anterior)) * 100 : null;

  const subiu = diferenca !== null && diferenca > 0;
  const desceu = diferenca !== null && diferenca < 0;

  // null = nem bom nem ruim (estável, ou sem base) — pílula fica neutra.
  const ehBom = subiu ? bomQuando === "sobe" : desceu ? bomQuando === "desce" : null;
  const corDelta = ehBom === null ? "var(--ink-3)" : ehBom ? "var(--acento)" : "var(--critico)";

  const seta = subiu ? "↑" : desceu ? "↓" : "→";
  const sinal = diferenca !== null && diferenca > 0 ? "+" : "";

  const deltaTexto = !temBase
    ? "—"
    : percentual !== null
      ? `${seta} ${sinal}${Math.round(percentual)}%`
      : `${seta} ${sinal}${formatarNumero(diferenca as number)}`;

  const baseTexto = temBase
    ? `${janela} · antes: ${formatarNumero(anterior)}`
    : `${janela} · sem período anterior`;

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-linha bg-superficie p-5">
      <span className="tipo-den-rotulo text-ink-3">{rotulo}</span>
      <div className="flex items-baseline gap-3">
        <span className="tipo-den-metrica text-ink">{valor}</span>
        <span
          className="inline-flex min-h-[1.375rem] items-center gap-1 rounded-pilula border px-2 py-0.5 text-[0.75rem] font-medium"
          style={{ color: corDelta, borderColor: corDelta }}
        >
          {deltaTexto}
        </span>
      </div>
      <span className="tipo-den-corpo text-ink-3">{baseTexto}</span>
    </div>
  );
}
