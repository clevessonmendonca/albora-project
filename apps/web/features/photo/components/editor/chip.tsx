"use client";

type ChipProps = {
  rotulo: string;
  miniatura?: string;
  ativo: boolean;
  sugerido?: boolean;
  onClick: () => void;
};

/**
 * Chip de filtro com miniatura.
 * Mostra preview do filtro e marca sugerido/ativo.
 */
export function Chip({
  rotulo,
  miniatura,
  ativo,
  sugerido,
  onClick,
}: ChipProps) {
  return (
    <button
      className={`ed-chip ${ativo ? "ativo" : ""} ${
        ativo || sugerido ? "text-acento-texto" : "text-ink-3"
      }`}
      onClick={onClick}
      aria-pressed={ativo}
    >
      <span
        className="ed-mini"
        style={{
          backgroundImage: miniatura ? `url(${miniatura})` : undefined,
        }}
      >
        {sugerido && <span className="ed-selo" aria-hidden="true" />}
      </span>
      <span className="ed-nome">{rotulo}</span>
    </button>
  );
}
