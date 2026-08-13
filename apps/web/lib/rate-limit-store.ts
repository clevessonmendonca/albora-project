/**
 * Rate limit no portão, não na saída.
 *
 * Invariante 4 da task 004: o pedido condenado não deve consumir assinatura,
 * nem cota, nem espaço no bucket. Por isso a checagem vem **antes** do
 * presign, e não depois do upload.
 *
 * **Duas camadas, e cada uma faz o que a outra não faz.**
 *
 * A camada grossa é a do Cloudflare, configurada no painel: durável,
 * distribuída, e a única que segura enchente de verdade vinda de fora.
 *
 * Esta é a fina, por instância e em memória. Ela existe porque a do
 * Cloudflare conta **por IP** — e num casamento os 200 convidados estão no
 * mesmo WiFi, atrás de um IP só. Uma regra de borda apertada o bastante para
 * conter um abusador estrangularia a festa inteira como se fosse uma pessoa.
 *
 * Por isso: a regra do Cloudflare fica generosa, dimensionada para o salão
 * inteiro; esta aqui é a que dá justiça **entre convidados**, contando por
 * sessão. Ela não segura ataque distribuído e não precisa — esse é o trabalho
 * da outra.
 */

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

/**
 * Sem poda, o Map cresce com a cardinalidade de sessões e IPs — que num
 * evento com 200 convidados e a noite inteira não é pequena.
 */
function prune(now: number): void {
  if (windows.size < 5_000) return;
  for (const [key, w] of windows) {
    if (now >= w.until) windows.delete(key);
  }
}

export function reset(): void {
  windows.clear();
}
