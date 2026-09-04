"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./variants";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  "aria-labelledby"?: string;
  "aria-label"?: string;
};

/**
 * Duração da animação de saída em JS — precisa bater com `duration-[var(--tempo-rapido)]`
 * abaixo. O `<dialog>` nativo fecha na hora; para a saída ter física (curva `saida`)
 * o fechamento real é adiado até a transição CSS terminar.
 */
const DURACAO_SAIDA_MS = 300;

function prefereMovimentoReduzido(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export function Dialog({
  open,
  onClose,
  children,
  className,
  ...ariaProps
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [fechando, setFechando] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (open) {
      setFechando(false);
      if (!el.open) {
        if (typeof el.showModal === "function") el.showModal();
        else el.setAttribute("open", "");
      }
      return;
    }

    if (!el.open) return;

    setFechando(true);
    const espera = prefereMovimentoReduzido() ? 0 : DURACAO_SAIDA_MS;
    const timer = window.setTimeout(() => {
      if (typeof el.close === "function") el.close();
      else el.removeAttribute("open");
      setFechando(false);
    }, espera);

    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
      data-state={fechando ? "closing" : "open"}
      className={cn(
        /*
         * `group` habilita conteúdo filho (o painel do BottomSheet) reagir ao
         * `data-state` daqui via `group-data-[state=closing]:...`, sem cada
         * consumidor duplicar a lógica de fechamento com física.
         */
        "group fixed inset-0 z-modal m-0 grid h-dvh w-dvw max-h-none max-w-none border-none p-4",
        /*
         * Scrim sólido e quente (token `--color-scrim-modal`, derivado de
         * `--noite`) — nunca `backdrop-filter`/blur, que é anti-padrão bloqueante.
         */
        "bg-[var(--color-scrim-modal)] backdrop:bg-transparent",
        "opacity-100 transition-opacity duration-[var(--tempo-rapido)] ease-mola starting:opacity-0",
        "data-[state=closing]:opacity-0 data-[state=closing]:ease-saida",
        className,
      )}
      {...ariaProps}
    >
      {children}
    </dialog>
  );
}
