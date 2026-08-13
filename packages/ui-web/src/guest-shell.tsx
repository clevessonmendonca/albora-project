"use client";

import type { ReactNode } from "react";
import { Avatar, initials } from "./avatar";
import { Button } from "./button";
import { StatusBar } from "./status-bar";
import { cn } from "./variants";

export const TAB_BAR_INSET = "calc(6.5rem + env(safe-area-inset-bottom))";
export const GUEST_PADDING_X = "1.125rem";

export const authorInitials = initials;

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
    <div
      className={cn(
        "flex flex-1 flex-col px-[1.125rem]",
        reserveTabBarSpace
          ? "pb-[calc(6.5rem+env(safe-area-inset-bottom))]"
          : "pb-6",
      )}
    >
      {children}
    </div>
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
        <a href={homeHref} className={titleClass}>
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
  return (
    <h1 className="mt-3.5 font-titulo text-[clamp(1.75rem,8vw,2rem)] font-light leading-[1.1] tracking-titulo [text-wrap:balance]">
      {children}
    </h1>
  );
}

export function SecondaryText({ children }: { children: ReactNode }) {
  return <p className="mt-3.5 text-[0.9375rem] text-ink-2">{children}</p>;
}

export function EmptyState({
  title,
  lede,
  cameraPath,
  cameraLabel = "Tirar foto",
}: {
  title: string;
  lede: string;
  cameraPath: string;
  cameraLabel?: string;
}) {
  return (
    <div className="grid gap-5 py-[calc(var(--espaco)*8)] text-center">
      <div>
        <p className="mb-1.5 font-titulo text-[1.6rem] font-medium leading-snug tracking-titulo [text-wrap:balance]">
          {title}
        </p>
        <p className="m-0 leading-relaxed text-ink-2">{lede}</p>
      </div>
      <a
        href={cameraPath}
        className="grid w-full place-items-center rounded-pilula bg-acento px-[1.125rem] py-[1.125rem] font-semibold text-sobre-acento no-underline"
      >
        {cameraLabel}
      </a>
    </div>
  );
}

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

export function GateNotice({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-token bg-superficie px-4 py-3.5">
      <span className="pulso mt-1.5 size-[0.4375rem] shrink-0 rounded-full bg-acento" />
      <span className="text-[0.8125rem] leading-snug text-ink-2">{children}</span>
    </div>
  );
}

export function MissionBanner({
  index,
  total,
  title,
}: {
  index: number;
  total: number;
  title: string;
}) {
  return (
    <div className="rounded-token bg-acento px-4 py-3.5 text-sobre-acento">
      <p className="m-0 text-[0.5625rem] uppercase tracking-rotulo opacity-75">
        Missão {String(index).padStart(2, "0")} de {String(total).padStart(2, "0")}
      </p>
      <p className="mt-1 font-titulo text-[1.0625rem] leading-tight">{title}</p>
    </div>
  );
}

export function PostAuthorAvatar({ name }: { name: string }) {
  return <Avatar name={name} className="size-[1.875rem] text-[0.75rem]" />;
}

export function PostHeader({ author, meta }: { author: string; meta?: string | null }) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <PostAuthorAvatar name={author} />
      <span className="flex-1 text-[0.84375rem]">{author}</span>
      {meta && <span className="text-[0.6875rem] text-ink-3">{meta}</span>}
    </div>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button type={type} variant="primary" size="lg" width="full" disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <Button
      type={type}
      variant="secondary"
      size="md"
      width="full"
      className="py-[0.9375rem] font-normal"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function NameField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={value}
      onChange={(ev) => onChange(ev.target.value)}
      placeholder={placeholder}
      maxLength={40}
      required
      autoComplete="given-name"
      enterKeyHint="go"
      className="w-full rounded-token border-0 border-b-2 border-b-acento bg-superficie px-[1.125rem] py-[1.0625rem] font-titulo text-[1.375rem] text-ink outline-none"
    />
  );
}

export function ConsentCheckbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange?: (value: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex items-start gap-3", onChange ? "cursor-pointer" : "cursor-default")}>
      <input
        type="checkbox"
        checked={checked}
        readOnly={!onChange}
        onChange={onChange ? (ev) => onChange(ev.target.checked) : undefined}
        className="pointer-events-none absolute size-px opacity-0"
      />
      <span
        className={cn(
          "grid size-[1.375rem] shrink-0 place-items-center rounded-[0.4375rem] border text-[0.8125rem]",
          checked
            ? "border-acento bg-acento text-sobre-acento"
            : "border-linha bg-transparent text-transparent",
        )}
      >
        {checked ? "✓" : ""}
      </span>
      <span className="text-[0.8125rem] leading-normal text-ink-2">{children}</span>
    </label>
  );
}

export function EntryColumn({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-7 px-7 pb-12">
      {children}
    </div>
  );
}

export function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const className =
    "border-0 bg-transparent p-0 font-[inherit] text-[inherit] leading-[inherit] text-acento underline underline-offset-[0.15em]";

  if (!onClick) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onClick();
      }}
      className={cn(className, "cursor-pointer")}
    >
      {children}
    </button>
  );
}

export function ConsentNote({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-token bg-superficie px-4 py-3.5 text-[0.8125rem] leading-snug text-ink-2">
      {children}
    </p>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-[0.85rem] text-critico">
      {children}
    </p>
  );
}

export function FinePrint({ children }: { children: ReactNode }) {
  return <p className="m-0 text-center text-xs text-ink-3">{children}</p>;
}
