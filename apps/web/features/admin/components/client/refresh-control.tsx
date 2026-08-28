"use client";

import { useEffect, useState } from "react";

export function AtualizadoHa({ desde }: { desde: Date }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const atualizar = () => setSegundos(Math.round((Date.now() - desde.getTime()) / 1000));
    atualizar();
    const id = setInterval(atualizar, 10_000);
    return () => clearInterval(id);
  }, [desde]);

  const rotulo =
    segundos < 10
      ? "agora mesmo"
      : segundos < 60
        ? `há ${segundos}s`
        : `há ${Math.round(segundos / 60)}min`;

  return <span className="text-xs text-ink-3">{rotulo}</span>;
}

export function RefreshButton({
  loading,
  onClick,
  label = "Atualizar agora",
}: {
  loading: boolean;
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="cursor-pointer rounded-pilula border border-linha bg-transparent p-1.5 text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink disabled:cursor-default disabled:opacity-50"
      aria-label={label}
    >
      <svg
        width="13"
        height="13"
        viewBox="0 0 13 13"
        fill="none"
        aria-hidden
        className={loading ? "opacity-50" : ""}
      >
        <path
          d="M11 6.5A4.5 4.5 0 0 1 2 6.5M11 6.5V3.5M11 6.5H8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
