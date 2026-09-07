"use client";

import type { ReactNode } from "react";
import { cn } from "./variants";
import { TextField } from "./text-field";

export function NameField({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Nome acessível do campo — não há rótulo visível por design; padrão cai no placeholder. */
  ariaLabel?: string;
  /** Foco de entrada — a tela de entrada leva o convidado direto ao teclado, sem toque extra. */
  autoFocus?: boolean;
}) {
  return (
    <TextField
      label=""
      aria-label={ariaLabel ?? placeholder}
      value={value}
      onChange={(ev) => onChange((ev.target as HTMLInputElement).value)}
      placeholder={placeholder}
      maxLength={40}
      required
      autoComplete="given-name"
      enterKeyHint="go"
      autoFocus={autoFocus ?? false}
      inputClassName="border-0 border-b-2 border-b-acento px-[1.125rem] py-[1.0625rem] font-titulo text-[1.375rem]"
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
    <label
      data-testid="consent-checkbox-hit-area"
      className={cn(
        "flex min-h-11 items-start gap-3",
        onChange ? "cursor-pointer" : "cursor-default",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        readOnly={!onChange}
        onChange={onChange ? (ev) => onChange(ev.target.checked) : undefined}
        className="peer pointer-events-none absolute size-px opacity-0"
      />
      <span
        data-testid="consent-checkbox-visual"
        className={cn(
          "grid size-6 shrink-0 place-items-center rounded-[0.4375rem] border text-[0.8125rem] transition-[border-color,background-color,box-shadow] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
          "peer-focus-visible:ring-2 peer-focus-visible:ring-acento-texto",
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
      className={cn(className, "cursor-pointer transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75")}
    >
      {children}
    </button>
  );
}
