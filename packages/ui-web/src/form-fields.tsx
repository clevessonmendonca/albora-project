"use client";

import type { ReactNode } from "react";
import { cn } from "./variants";

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
          "grid size-[1.375rem] shrink-0 place-items-center rounded-[0.4375rem] border text-[0.8125rem] transition-[border-color,background-color] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
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
