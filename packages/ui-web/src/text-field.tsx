"use client";

import { useId, type InputHTMLAttributes } from "react";
import { cn } from "./variants";

type TextFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  inputClassName?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className">;

export function TextField({
  label,
  hint,
  error,
  disabled,
  inputClassName,
  id: externalId,
  ...inputProps
}: TextFieldProps) {
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
      <input
        id={id}
        disabled={disabled}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        className={cn(
          "rounded-token border bg-superficie px-3.5 py-2.5 font-corpo text-[0.9375rem] text-ink outline-none transition-[border-color,box-shadow] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
          "placeholder:text-ink-3",
          "focus:border-acento-texto focus:ring-1 focus:ring-acento-texto",
          error ? "border-critico" : "border-linha",
          disabled && "cursor-not-allowed opacity-50",
          inputClassName,
        )}
        {...inputProps}
      />
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
