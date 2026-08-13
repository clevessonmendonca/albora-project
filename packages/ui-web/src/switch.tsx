"use client";

import { cn } from "./variants";

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange?: (value: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-7 w-[3.25rem] shrink-0 items-center rounded-pilula p-0.5 transition-colors duration-200",
        checked ? "bg-acento" : "bg-linha",
      )}
    >
      <span
        className={cn(
          "size-6 rounded-full bg-superficie-alta shadow-suave transition-transform duration-200",
          checked ? "translate-x-[1.5rem]" : "translate-x-0",
        )}
      />
    </button>
  );
}
