import type { SessaoResolvida } from "@albora/db";
import { consume } from "@/lib/rate-limit-store";
import { limitIdentity } from "@/lib/session";
import { errorResponse } from "./response";
import { DEFAULT_RATE_LIMIT } from "./constants";

export type RateLimitOptions = {
  max?: number;
  windowSec?: number;
  message?: string;
  /** Prefix prepended to the rate-limit key (e.g. "album:", "midia:"). */
  keyPrefix?: string;
};

export function enforceRateLimit(
  req: Request,
  session: SessaoResolvida | null,
  options: RateLimitOptions = {},
): Response | null {
  const max = options.max ?? DEFAULT_RATE_LIMIT.max;
  const windowSec = options.windowSec ?? DEFAULT_RATE_LIMIT.windowSec;
  const message = options.message ?? "Espere um instante";

  const base = limitIdentity(req, session);
  const key = options.keyPrefix ? `${options.keyPrefix}${base}` : base;
  const limit = consume(key, max, windowSec, Date.now());
  if (!limit.allowed) {
    const res = errorResponse(429, "limite.excedido", message, {
      retry_after_seconds: limit.resetInSeconds,
    });
    const headers = new Headers(res.headers);
    headers.set("Retry-After", String(limit.resetInSeconds));
    return new Response(res.body, { status: 429, headers });
  }
  return null;
}
