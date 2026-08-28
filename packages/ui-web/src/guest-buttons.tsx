"use client";

import type { ReactNode } from "react";
import { Button } from "./button";

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
