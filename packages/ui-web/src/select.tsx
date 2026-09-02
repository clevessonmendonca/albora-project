"use client";

import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "./variants";

type SelectProps = {
  label: string;
  hint?: string;
  error?: string;
  selectClassName?: string;
  children: React.ReactNode;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className">;

export function Select({
  label,
  hint,
  error,
  disabled,
  selectClassName,
  id: externalId,
  children,
  ...selectProps
}: SelectProps) {
  const autoId = useId();
  const id = externalId ?? autoId;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <select
        id={id}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "appearance-none rounded-token border bg-superficie px-3.5 py-2.5 pr-8 font-corpo text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%228%22%20viewBox%3D%220%200%2012%208%22%3E%3Cpath%20fill%3D%22%23666%22%20d%3D%22M1.4%200L6%204.6%2010.6%200%2012%201.4l-6%206-6-6z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:0.75rem] bg-[position:right_0.75rem_center] bg-no-repeat",
          "focus:border-acento-texto focus:ring-1 focus:ring-acento-texto",
          error ? "border-critico" : "border-linha",
          disabled && "cursor-not-allowed opacity-50",
          selectClassName,
        )}
        {...selectProps}
      >
        {children}
      </select>
      {hint && !error && (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-critico">
          {error}
        </p>
      )}
    </div>
  );
}
