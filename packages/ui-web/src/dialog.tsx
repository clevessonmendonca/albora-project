"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "./variants";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

export function Dialog({
  open,
  onClose,
  children,
  className,
  ...ariaProps
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open) {
      if (!el.open) {
        if (typeof el.showModal === "function") el.showModal();
        else el.setAttribute("open", "");
      }
    } else if (el.open) {
      if (typeof el.close === "function") el.close();
      else el.removeAttribute("open");
    }
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
      className={cn(
        "fixed inset-0 z-modal m-0 grid h-dvh w-dvw max-h-none max-w-none border-none bg-bg-overlay p-4",
        "backdrop:bg-transparent",
        className,
      )}
      {...ariaProps}
    >
      {children}
    </dialog>
  );
}
