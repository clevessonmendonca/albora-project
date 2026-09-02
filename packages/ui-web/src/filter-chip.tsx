type FilterChipProps = {
  label: string;
  thumbnail?: string;
  active: boolean;
  suggested?: boolean;
  onClick: () => void;
};

export function FilterChip({
  label,
  thumbnail,
  active,
  suggested,
  onClick,
}: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-col items-center gap-1.5 rounded-token border px-3 py-2 transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
        active
          ? "border-acento bg-acento-superficie text-acento-texto"
          : "border-linha bg-superficie text-ink-3 hover:border-acento-borda hover:text-ink-2"
      }`}
    >
      {thumbnail && (
        <div className="relative size-12 overflow-hidden rounded-token">
          <img
            src={thumbnail}
            alt=""
            className="size-full object-cover"
          />
          {suggested && !active && (
            <div className="absolute right-1 top-1 size-2 rounded-full bg-acento" />
          )}
        </div>
      )}
      <span className="text-[0.75rem] font-medium">
        {label}
      </span>
    </button>
  );
}
