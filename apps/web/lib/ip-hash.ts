import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { config } from "./config";

/**
 * Mesmo padrão de `apps/web/features/console/actions.ts` (privado lá,
 * duplicado aqui de propósito — `packages/application` não pode importar
 * de `apps/web`, e alcançar dentro do privado de outra feature seria pior):
 * HMAC-SHA256 com `sessionSecret`, nunca hash puro — IPv4 tem só 2^32
 * valores, hash sem chave seria reversível por força bruta.
 */
export async function currentIpHash(): Promise<string> {
  const jar = await headers();
  const ip = jar.get("cf-connecting-ip") ?? jar.get("x-forwarded-for");
  const { sessionSecret } = config();
  return createHmac("sha256", sessionSecret).update(ip ?? "sem-ip").digest("hex");
}
