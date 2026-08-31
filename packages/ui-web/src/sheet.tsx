"use client";

import { useEffect, type ReactNode } from "react";

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

  if (!open) return null;

  const headingId = titleId ?? "sheet-title";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={headingId}
      className="fixed inset-0 z-[35] grid place-items-end bg-bg-overlay p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      onClick={onClose}
    >
      <div
        className="grid max-h-[min(78dvh,32rem)] w-[min(26rem,100%)] grid-rows-[auto_1fr_auto] gap-3.5 overflow-hidden rounded-superficie border border-linha bg-superficie p-5"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id={headingId} className="m-0 font-titulo text-[1.0625rem] font-normal">
          {title}
        </h2>
        <div className="min-h-0 overflow-auto">{children}</div>
        {footer}
      </div>
    </div>
  );
}
