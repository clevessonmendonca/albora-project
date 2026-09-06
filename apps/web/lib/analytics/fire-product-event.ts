"use client";

import { isRefToken } from "@albora/core";
import type { ProductEventName } from "@albora/db";

function anonId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `a${Date.now()}`;
}

/** Lê `?ref=` da query atual (ou da string dada). Só devolve ref no formato válido. */
export function refDaUrl(search: string = typeof window !== "undefined" ? window.location.search : ""): string | null {
  const ref = new URLSearchParams(search).get("ref");
  return isRefToken(ref) ? ref : null;
}

export function fireProductEvent(
  name: ProductEventName,
  opts?: { packHint?: string | null; originRef?: string | null },
): void {
  void fetch("/api/analytics/product", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name,
      anonId: anonId(),
      packHint: opts?.packHint ?? null,
      originRef: opts?.originRef ?? null,
    }),
  }).catch(() => {});
}
