export type ChartSeriesPoint = { label: string; value: number };

/** Tabela oculta visualmente — mesma série do SVG, para quem usa leitor de tela. */
function VisuallyHiddenTable({ caption, points }: { caption: string; points: ChartSeriesPoint[] }) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th>Rótulo</th>
          <th>Valor</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.label}>
            <td>{p.label}</td>
            <td>{p.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Sparkline({
  points,
  label,
  width = 160,
  height = 40,
}: {
  points: ChartSeriesPoint[];
  /** Obrigatório — sem ele o gráfico não existe para quem usa leitor de tela. */
  label: string;
  width?: number;
  height?: number;
}) {
  if (points.length === 0) {
    return <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`} />;
  }

  const valores = points.map((p) => p.value);
  const max = Math.max(...valores, 1);
  const min = Math.min(...valores, 0);
  const amplitude = max - min || 1;
  const passo = width / Math.max(points.length - 1, 1);

  const d = points
    .map((p, i) => {
      const x = i * passo;
      const y = height - ((p.value - min) / amplitude) * height;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <>
      <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <path d={d} fill="none" stroke="var(--acento)" strokeWidth="2" />
      </svg>
      <VisuallyHiddenTable caption={label} points={points} />
    </>
  );
}

export function BarChart({
  points,
  label,
  width = 240,
  height = 120,
}: {
  points: ChartSeriesPoint[];
  /** Obrigatório — sem ele o gráfico não existe para quem usa leitor de tela. */
  label: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...points.map((p) => p.value), 1);
  const largura = points.length > 0 ? width / points.length : width;

  return (
    <>
      <svg role="img" aria-label={label} width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {points.map((p, i) => {
          const alturaBarra = max > 0 ? (p.value / max) * height : 0;
          return (
            <rect
              key={p.label}
              x={i * largura + largura * 0.1}
              y={height - alturaBarra}
              width={largura * 0.8}
              height={alturaBarra}
              fill="var(--acento)"
            />
          );
        })}
      </svg>
      <VisuallyHiddenTable caption={label} points={points} />
    </>
  );
}

/** Paleta de fatias do Donut — semântica, não decorativa: cada tom já existe em outro lugar do produto. */
const CORES_DONUT = ["var(--acento)", "var(--ink-3)", "var(--critico)", "var(--linha)"];

export function Donut({
  points,
  label,
  size = 120,
  thickness = 16,
}: {
  points: ChartSeriesPoint[];
  /** Obrigatório — sem ele o gráfico não existe para quem usa leitor de tela. */
  label: string;
  size?: number;
  thickness?: number;
}) {
  const total = points.reduce((soma, p) => soma + p.value, 0);
  const raio = (size - thickness) / 2;
  const centro = size / 2;
  const circunferencia = 2 * Math.PI * raio;

  let acumulado = 0;

  return (
    <>
      <svg role="img" aria-label={label} width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {total <= 0 ? (
          <circle cx={centro} cy={centro} r={raio} fill="none" stroke="var(--linha)" strokeWidth={thickness} />
        ) : (
          points.map((p, i) => {
            const fatia = (p.value / total) * circunferencia;
            const dashoffset = -acumulado;
            acumulado += fatia;
            return (
              <circle
                key={p.label}
                cx={centro}
                cy={centro}
                r={raio}
                fill="none"
                stroke={CORES_DONUT[i % CORES_DONUT.length]}
                strokeWidth={thickness}
                strokeDasharray={`${fatia} ${circunferencia - fatia}`}
                strokeDashoffset={dashoffset}
                transform={`rotate(-90 ${centro} ${centro})`}
              />
            );
          })
        )}
      </svg>
      <VisuallyHiddenTable caption={label} points={points} />
    </>
  );
}
