/** Rate limit por sessão, antes do presign — regra grossa no Cloudflare (por IP/salão), esta fina por sessão dá justiça entre convidados; não segura ataque distribuído. */

type Window = { until: number; uses: number };

const windows = new Map<string, Window>();

export type RateLimitResult = { allowed: boolean; remaining: number; resetInSeconds: number };

export function consume(
  key: string,
  max: number,
  windowSec: number,
  now: number,
): RateLimitResult {
  const current = windows.get(key);

  if (!current || now >= current.until) {
    const next = { until: now + windowSec * 1000, uses: 1 };
    windows.set(key, next);
    prune(now);
    return { allowed: true, remaining: max - 1, resetInSeconds: windowSec };
  }

  current.uses += 1;
  const resetInSeconds = Math.ceil((current.until - now) / 1000);

  return {
    allowed: current.uses <= max,
    remaining: Math.max(0, max - current.uses),
    resetInSeconds,
  };
}

/** Sem poda o Map cresce com cardinalidade de sessões — 200 convidados a noite inteira não é pequena. */
function prune(now: number): void {
  if (windows.size < 5_000) return;
  for (const [key, w] of windows) {
    if (now >= w.until) windows.delete(key);
  }
}

export function reset(): void {
  windows.clear();
}
