"use client";

import { fireProductEvent, refDaUrl } from "@/lib/analytics/fire-product-event";

export type LandingProductName =
  | "landing_view"
  | "landing_cta"
  | "landing_veteran_cta"
  | "landing_scroll_50"
  | "landing_demo";

/** A landing encaminha o `?ref=` da URL: quem chegou por um convidado é atribuído já no primeiro evento. */
export function fireLandingProduct(name: LandingProductName, packHint?: string) {
  fireProductEvent(name, { packHint: packHint ?? null, originRef: refDaUrl() });
}
