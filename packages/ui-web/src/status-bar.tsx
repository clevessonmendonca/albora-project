const SIGNAL_BAR_HEIGHTS = ["h-[0.4125rem]", "h-[0.5625rem]", "h-[0.75rem]"] as const;

export function StatusBar() {
  return (
    <div className="flex items-center justify-between px-[1.625rem] pb-1.5 pt-3.5 text-[0.8125rem] font-semibold text-ink">
      <span>23:41</span>
      <span className="flex items-center gap-1">
        {SIGNAL_BAR_HEIGHTS.map((heightClass) => (
          <span key={heightClass} className={`w-[0.1875rem] bg-current ${heightClass}`} />
        ))}
        <span className="ml-1.5 h-[0.6875rem] w-[1.375rem] rounded-[0.25rem] border border-current p-px">
          <span className="block h-full w-[70%] bg-current" />
        </span>
      </span>
    </div>
  );
}
