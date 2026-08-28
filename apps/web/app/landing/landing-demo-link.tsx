"use client";

import { type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { fireLandingProduct } from "./landing-product";

/** Link de demo — dispara `landing_demo` sem bloquear a navegação. */
export function LandingDemoLink({
  packHint,
  children,
  onClick,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  packHint?: string;
  children: ReactNode;
}) {
  return (
    <a
      {...rest}
      onClick={(ev: MouseEvent<HTMLAnchorElement>) => {
        fireLandingProduct("landing_demo", packHint);
        onClick?.(ev);
      }}
    >
      {children}
    </a>
  );
}
