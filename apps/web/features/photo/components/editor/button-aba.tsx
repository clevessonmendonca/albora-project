"use client";

type ButtonAbaProps = {
  rotulo: string;
  ativa: boolean;
  onClick: () => void;
};

/**
 * Botão de aba do editor.
 * Componente atômico reutilizável.
 */
export function ButtonAba({ rotulo, ativa, onClick }: ButtonAbaProps) {
  return (
    <button
      className={`ed-aba border-b ${
        ativa
          ? "border-acento text-acento-texto"
          : "border-transparent text-ink-3"
      }`}
      aria-pressed={ativa}
      onClick={onClick}
    >
      {rotulo}
    </button>
  );
}
