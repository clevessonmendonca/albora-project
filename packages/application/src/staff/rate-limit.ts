/**
 * Limitador em memória local ao caso de uso — não pode importar de
 * `apps/web/lib/infrastructure/background/rate-limit-store.ts` porque
 * `packages/application` não pode importar de `apps/web` (guard `camadas`).
 * Cópia mínima da mesma lógica; não é o mesmo Map do rate limiter de upload.
 */

type Window = { until: number; uses: number };

const windows = new Map<string, Window>();

/** `true` se a chave ainda está dentro do limite; incrementa o contador da janela. */
export function consumeRateLimit(key: string, max: number, windowSec: number, now = Date.now()): boolean {
  const current = windows.get(key);

  if (!current || now >= current.until) {
    windows.set(key, { until: now + windowSec * 1000, uses: 1 });
    return true;
  }

  current.uses += 1;
  return current.uses <= max;
}

export function resetRateLimit(): void {
  windows.clear();
}
