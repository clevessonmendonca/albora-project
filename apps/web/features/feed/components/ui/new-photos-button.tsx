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
      className="feed-pill fixed left-1/2 z-30 flex min-h-11 cursor-pointer items-center gap-1.5 rounded-pilula border-none bg-acento px-5 text-[0.8125rem] font-medium text-sobre-acento shadow-alta transition-transform duration-instantaneo ease-mola hover:opacity-90 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      style={{ top: "calc(4rem + env(safe-area-inset-top))" }}
    >
      ↑ Novas fotos
    </button>
  );
}
