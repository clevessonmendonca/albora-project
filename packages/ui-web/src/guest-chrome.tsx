"use client";

import type { ReactNode } from "react";
import { StatusBar } from "./status-bar";
import { cn } from "./variants";

export const TAB_BAR_INSET = "calc(6.5rem + env(safe-area-inset-bottom))";
export const GUEST_PADDING_X = "1.125rem";

export function GuestShell({
  children,
  hideStatusBar,
}: {
  children: ReactNode;
  hideStatusBar?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg font-corpo text-ink leading-normal">
      {!hideStatusBar && <StatusBar />}
      {children}
    </div>
  );
}

export function GuestMain({
  children,
  reserveTabBarSpace = true,
}: {
  children: ReactNode;
  reserveTabBarSpace?: boolean;
}) {
  return (
    <main
      id="main-content"
      className={cn(
        "flex flex-1 flex-col px-[1.125rem]",
        reserveTabBarSpace
          ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
          : "pb-6",
      )}
    >
      {children}
    </main>
  );
}

export function GuestHeader({
  title,
  homeHref,
  action,
}: {
  title: string;
  homeHref?: string;
  action?: ReactNode;
}) {
  const titleClass =
    "font-titulo text-[1.125rem] tracking-titulo text-inherit no-underline";

  return (
    <div className="flex items-center justify-between gap-3 pb-3.5 pt-1.5">
      {homeHref ? (
        <a href={homeHref} className={cn(titleClass, "transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75")}>
          {title}
        </a>
      ) : (
        <span className={titleClass}>{title}</span>
      )}
      {action}
    </div>
  );
}

export function EventLabel({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-acento">{children}</p>
  );
}

export function DisplayTitle({ children }: { children: ReactNode }) {
  return <h1 className="tipo-title tipo-balance mt-3.5">{children}</h1>;
}

export function SecondaryText({ children }: { children: ReactNode }) {
  return <p className="mt-3.5 text-[0.9375rem] text-ink-2">{children}</p>;
}

export function EmptyState({
  title,
  lede,
  titulo,
  descricao,
  icon,
  cameraPath,
  cameraLabel = "Tirar foto",
  acao,
}: {
  /** @deprecated usar `titulo` */
  title?: string;
  /** @deprecated usar `descricao` */
  lede?: string;
  titulo?: string;
  descricao?: string;
  /** Decorativo — o título já carrega o significado, então some do leitor de tela. */
  icon?: ReactNode;
  cameraPath?: string;
  cameraLabel?: string;
  /** Sobrepõe o CTA padrão de câmera quando presente. */
  acao?: ReactNode;
}) {
  const tituloFinal = titulo ?? title ?? "";
  const descricaoFinal = descricao ?? lede ?? "";
  const acaoFinal =
    acao ??
    (cameraPath ? (
      <a
        href={cameraPath}
        className="grid w-full place-items-center rounded-pilula bg-acento px-[1.125rem] py-[1.125rem] font-semibold text-sobre-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90"
      >
        {cameraLabel}
      </a>
    ) : null);

  return (
    <div className="grid gap-6 py-[calc(var(--espaco)*8)] text-center">
      {icon ? (
        <div className="flex justify-center text-ink-3" aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="m-0 mb-1.5 tipo-title tipo-balance">{tituloFinal}</p>
        <p className="m-0 tipo-body text-ink-2">{descricaoFinal}</p>
      </div>
      {acaoFinal}
    </div>
  );
}

export function EntryColumn({ children }: { children: ReactNode }) {
  return (
    <div
      id="main-content"
      className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-7 px-7 pb-12"
    >
      {children}
    </div>
  );
}

export function FinePrint({ children }: { children: ReactNode }) {
  return <p className="m-0 text-center text-xs text-ink-3">{children}</p>;
}
