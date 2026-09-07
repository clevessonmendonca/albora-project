"use client";

import { cn } from "./variants";

export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange?: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onChange?.(!checked);
      }}
      className={cn(
        "relative inline-flex h-7 w-[3.25rem] shrink-0 items-center rounded-pilula p-0.5 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
        // Área de toque ≥44px sem alterar o track visível: um `::before`
        // invisível estica o alvo clicável para cima/baixo do track de 28px.
        "before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']",
        checked ? "bg-acento" : "bg-linha",
        disabled ? "cursor-wait opacity-60" : "",
      )}
    >
      <span
        className={cn(
          "size-6 rounded-full bg-superficie-alta shadow-suave transition-transform duration-[var(--tempo-rapido)] ease-[var(--curva)]",
          checked ? "translate-x-[1.5rem]" : "translate-x-0",
        )}
      />
    </button>
  );
}
