type FilterChipProps = {
  label: string;
  thumbnail?: string | undefined;
  active: boolean;
  suggested?: boolean | undefined;
  onClick: () => void;
};

/**
 * Chip de filtro com thumbnail opcional.
 * Mostra preview visual e marca sugerido/ativo. Toque dá feedback de mola
 * (é um alvo tocado repetidamente ao comparar presets, não uma revelação).
 */
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
      className={`flex min-h-11 w-16 shrink-0 flex-col items-center gap-1.5 rounded-token border bg-transparent px-1 py-1 transition-[border-color,color,transform] duration-instantaneo ease-mola active:scale-95 motion-reduce:active:scale-100 ${
        active
          ? "border-acento bg-acento-superficie text-acento-texto"
          : "border-linha bg-superficie text-ink-3 hover:border-acento-borda hover:text-ink-2"
      }`}
    >
      {thumbnail && (
        <div className="relative size-16 overflow-hidden rounded-token bg-superficie-alta shadow-suave">
          <img src={thumbnail} alt="" className="size-full object-cover" />
          {suggested && !active && (
            <div className="absolute right-1 top-1 size-2 rounded-full bg-acento" />
          )}
        </div>
      )}
      <span className="tipo-label w-full truncate text-center uppercase">{label}</span>
    </button>
  );
}
