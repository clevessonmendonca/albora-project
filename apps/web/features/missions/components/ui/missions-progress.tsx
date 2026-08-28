"use client";

type MissionsProgressProps = {
  done: number;
  total: number;
};

export function MissionsProgress({ done, total }: MissionsProgressProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const concluidas = done === total;

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex justify-between text-xs text-ink-3">
        <span>{done === total ? "Todas completas" : `${done} de ${total} missões`}</span>
        <span className={concluidas ? "text-acento-texto" : ""}>{pct}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-superficie-alta">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[var(--curva)]"
          style={{
            width: `${pct}%`,
            background: concluidas ? "var(--acento)" : "var(--ink-2)",
          }}
        />
      </div>
    </div>
  );
}
