"use client";

import { type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { fireLandingProduct } from "./landing-product";

/** CTA Grátis / Completo — dispara `landing_cta` sem bloquear a navegação. */
export function LandingCtaLink({
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
        fireLandingProduct("landing_cta", packHint);
        onClick?.(ev);
      }}
    >
      {children}
    </a>
  );
}
