"use client";

/** Helpers de product_events da landing — só client. */

export type LandingProductName =
  | "landing_view"
  | "landing_cta"
  | "landing_scroll_50"
  | "landing_demo";

function anonId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `a${Date.now()}`;
}

export function fireLandingProduct(name: LandingProductName, packHint?: string) {
  void fetch("/api/analytics/product", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, anonId: anonId(), packHint: packHint ?? null }),
  }).catch(() => {});
}
