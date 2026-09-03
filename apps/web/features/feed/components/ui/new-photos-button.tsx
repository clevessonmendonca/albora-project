"use client";

type NewPhotosButtonProps = {
  onClick: () => void;
};

export function NewPhotosButton({ onClick }: NewPhotosButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Novas fotos disponíveis. Ir para o topo do feed"
      className="feed-pill fixed left-1/2 z-30 flex cursor-pointer items-center gap-1.5 rounded-pilula border-none bg-acento px-4 py-2 text-[0.8125rem] text-sobre-acento shadow-suave"
      style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
    >
      ↑ Novas fotos
    </button>
  );
}