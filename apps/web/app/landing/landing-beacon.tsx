"use client";

import { useEffect, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from "react";

function anonId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `a${Date.now()}`;
}

function fireProduct(name: "landing_view" | "landing_cta", packHint?: string) {
  void fetch("/api/analytics/product", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, anonId: anonId(), packHint: packHint ?? null }),
  }).catch(() => {});
}

/** Best-effort landing funnel. Falha engolida. */
export function LandingBeacon({ packHint }: { packHint?: string }) {
  useEffect(() => {
    fireProduct("landing_view", packHint);
  }, [packHint]);
  return null;
}

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
        fireProduct("landing_cta", packHint);
        onClick?.(ev);
      }}
    >
      {children}
    </a>
  );
}
