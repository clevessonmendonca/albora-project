"use client";

type LightboxTopBarProps = {
  onRequestPhoto: () => void;
  onClose: () => void;
};

export function LightboxTopBar({ onRequestPhoto, onClose }: LightboxTopBarProps) {
  return (
    <>
      <button
        type="button"
        aria-label="Pedir para tirar esta foto"
        className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-20 min-h-11 rounded-pilula border border-linha bg-superficie px-4 py-2 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento hover:text-acento"
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
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-20 min-h-11 rounded-pilula border border-linha bg-superficie px-4 py-2 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento hover:text-acento"
        onClick={(ev) => {
          ev.stopPropagation();
          onClose();
        }}
      >
        Fechar
      </button>
    </>
  );
}
