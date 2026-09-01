"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export function BottomSheet({
  title,
  open,
  onClose,
  children,
  footer,
  titleId,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  titleId?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else if (mounted) {
      setVisible(false);
    }
  }, [open, mounted]);

  const handleTransitionEnd = useCallback(() => {
    if (!visible && !open) setMounted(false);
  }, [visible, open]);

  useEffect(() => {
    if (!open) return;
    function tecla(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        ev.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antes;
    };
  }, [open]);

  if (!mounted) return null;

  const headingId = titleId ?? "sheet-title";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-[35] grid place-items-end p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-[background-color] duration-[var(--tempo-medio,0.35s)] ease-[var(--curva,cubic-bezier(0.2,0,0,1))]"
      style={{ backgroundColor: visible ? "var(--bg-overlay, rgba(0,0,0,0.45))" : "transparent" }}
      onClick={onClose}
      onTransitionEnd={handleTransitionEnd}
    >
      <div
        ref={panelRef}
        className="grid max-h-[min(78dvh,32rem)] w-[min(26rem,100%)] grid-rows-[auto_1fr_auto] gap-3.5 overflow-hidden rounded-superficie border border-linha bg-superficie p-5 transition-transform duration-[var(--tempo-medio,0.35s)] ease-[var(--curva,cubic-bezier(0.2,0,0,1))] motion-reduce:transition-none"
        style={{ transform: visible ? "translateY(0)" : "translateY(100%)" }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={headingId} className="m-0 font-titulo text-[1.0625rem] font-normal">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="grid size-8 cursor-pointer place-items-center rounded-full border-0 bg-transparent text-lg text-ink-3 transition-colors duration-[var(--tempo-rapido,0.3s)] ease-[var(--curva)] hover:bg-linha hover:text-ink active:bg-linha"
          >
            ×
          </button>
        </div>
        <div className="min-h-0 overflow-auto">{children}</div>
        {footer}
      </div>
    </div>
  );
}
