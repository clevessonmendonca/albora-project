"use client";

type LightboxTopBarProps = {
  onRequestPhoto: () => void;
  onClose: () => void;
};

const CLASSE_SOMBRA_TEXTO = "[text-shadow:0_1px_4px_var(--bg)]";

export function LightboxTopBar({ onRequestPhoto, onClose }: LightboxTopBarProps) {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-veu-feed-topo px-4 pb-8 pt-[max(1rem,env(safe-area-inset-top))]">
      <button
        type="button"
        aria-label="Pedir para tirar esta foto"
        className={`${CLASSE_SOMBRA_TEXTO} pointer-events-auto min-h-11 cursor-pointer rounded-pilula border border-linha bg-transparent px-4 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-2 transition-[color,border-color,transform] duration-instantaneo ease-mola hover:border-acento hover:text-acento active:scale-[0.96]`}
        onClick={(ev) => {
          ev.stopPropagation();
          onRequestPhoto();
        }}
      >
        Pedir para tirar
      </button>
      <button
        type="button"
        aria-label="Fechar"
        className={`${CLASSE_SOMBRA_TEXTO} pointer-events-auto min-h-11 min-w-11 cursor-pointer rounded-pilula border border-linha bg-transparent px-4 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-2 transition-[color,border-color,transform] duration-instantaneo ease-mola hover:border-acento hover:text-acento active:scale-[0.96]`}
        onClick={(ev) => {
          ev.stopPropagation();
          onClose();
        }}
      >
        Fechar
      </button>
    </header>
  );
}
