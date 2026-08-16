"use client";

import { useEffect } from "react";

/** Best-effort landing funnel. Falha engolida. */
export function LandingBeacon({ packHint }: { packHint?: string }) {
  useEffect(() => {
    const anonId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a${Date.now()}`;
    void fetch("/api/analytics/product", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "landing_view", anonId, packHint: packHint ?? null }),
    }).catch(() => {});
  }, [packHint]);
  return null;
}
