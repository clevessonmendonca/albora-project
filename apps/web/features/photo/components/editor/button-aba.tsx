"use client";

type ButtonAbaProps = {
  rotulo: string;
  ativa: boolean;
  onClick: () => void;
};

/**
 * Botão de uma aba do editor — texto uppercase no padrão `EditorialTabs`
 * (Onda 0). O traço embaixo da aba ativa é um indicador único e deslizante
 * desenhado pelo pai (`EditorControls`), não por cada botão: assim ele
 * desliza de uma aba pra outra em vez de saltar.
 */
export function ButtonAba({ rotulo, ativa, onClick }: ButtonAbaProps) {
  return (
    <button
      type="button"
      className={`tipo-label flex min-h-11 items-center justify-center uppercase transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
        ativa ? "text-ink" : "text-ink-3 hover:text-ink-2"
      }`}
      aria-pressed={ativa}
      onClick={onClick}
    >
      {rotulo}
    </button>
  );
}
