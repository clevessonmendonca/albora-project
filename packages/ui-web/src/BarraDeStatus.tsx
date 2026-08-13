/**
 * Barra de status decorativa — faz a tela caber no aparelho do catálogo `/telas`.
 */
export function BarraDeStatus({ claro }: { claro?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-[1.625rem] pb-1.5 pt-3.5 text-[0.8125rem] font-semibold ${
        claro ? "text-ink" : "text-ink"
      }`}
    >
      <span>23:41</span>
      <span className="flex items-center gap-1">
        {[0.55, 0.75, 1].map((h) => (
          <span
            key={h}
            className="w-[0.1875rem] bg-current"
            style={{ height: `${h * 0.75}rem` }}
          />
        ))}
        <span className="ml-1.5 h-[0.6875rem] w-[1.375rem] rounded-[0.25rem] border border-current p-px">
          <span className="block h-full w-[70%] bg-current" />
        </span>
      </span>
    </div>
  );
}
