type ProgressBarProps = {
  current: number;
  total: number;
  label?: string;
  completedLabel?: string;
  showPercentage?: boolean;
  accentWhenComplete?: boolean;
};

export function ProgressBar({
  current,
  total,
  label,
  completedLabel,
  showPercentage = true,
  accentWhenComplete = true,
}: ProgressBarProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current === total && total > 0;

  const displayLabel = isComplete && completedLabel
    ? completedLabel
    : label || `${current} de ${total}`;

  return (
    <div className="mb-5">
      <div className="mb-1.5 flex justify-between text-xs text-ink-3">
        <span>{displayLabel}</span>
        {showPercentage && (
          <span className={isComplete && accentWhenComplete ? "text-acento-texto" : ""}>
            {pct}%
          </span>
        )}
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-superficie-alta">
        <div
          className="h-full rounded-full transition-all duration-700 ease-[var(--curva)]"
          style={{
            width: `${pct}%`,
            background: isComplete && accentWhenComplete ? "var(--acento)" : "var(--ink-2)",
          }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>
    </div>
  );
}
