"use client";

import { type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";
import { fireLandingProduct } from "./landing-product";

export function LandingVeteranCtaLink({
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
        fireLandingProduct("landing_veteran_cta", packHint);
        onClick?.(ev);
      }}
    >
      {children}
    </a>
  );
}
