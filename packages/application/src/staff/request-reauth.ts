import type { Pool } from "pg";
import { createStaffMagicLink, insertSecurityEvent } from "@albora/db";
import { consumeRateLimit } from "./rate-limit";
import { generateStaffMagicLinkToken } from "./token";

/**
 * Mais curto que `MAGIC_LINK_TTL_MINUTES` (login, 15min) de propósito: o
 * step-up confirma uma ação que o operador está prestes a fazer agora, não
 * abre uma sessão nova — uma janela longa para clicar deixaria o link de
 * confirmação vivo tempo demais na caixa de entrada.
 */
export const REAUTH_LINK_TTL_MINUTES = 5;
const MAX_REQUESTS_PER_STAFF_PER_HOUR = 5;
const MAX_REQUESTS_PER_IP_PER_HOUR = 5;

export type RequestStaffReauthInput = {
  staffUserId: string;
  email: string;
  ipHash: string;
  sendEmail: (input: { to: string; token: string }) => Promise<void> | void;
};

export type RequestStaffReauthResult = { sent: true };

/**
 * Diferente de `requestStaffLogin`: aqui o staff já está autenticado (o
 * `staffUserId` vem da sessão, não de um e-mail digitado por um visitante
 * anônimo), então não há oráculo de enumeração a fechar — sempre envia.
 * Estouro de rate limit (por staff E por IP) grava `security_events` e
 * ainda assim devolve a mesma resposta.
 */
export async function requestStaffReauth(pool: Pool, input: RequestStaffReauthInput): Promise<RequestStaffReauthResult> {
  const withinLimit =
    consumeRateLimit(`reauth-staff:${input.staffUserId}`, MAX_REQUESTS_PER_STAFF_PER_HOUR, 3600) &&
    consumeRateLimit(`reauth-ip:${input.ipHash}`, MAX_REQUESTS_PER_IP_PER_HOUR, 3600);

  if (!withinLimit) {
    await insertSecurityEvent(pool, {
      kind: "rate_limit.exceeded",
      actorKind: "staff",
      actorId: input.staffUserId,
      ipHash: input.ipHash,
      metadata: { surface: "staff_reauth" },
    });
    return { sent: true };
  }

  const { token, tokenHash } = generateStaffMagicLinkToken();
  const expiresAt = new Date(Date.now() + REAUTH_LINK_TTL_MINUTES * 60 * 1000);

  await createStaffMagicLink(pool, { staffUserId: input.staffUserId, tokenHash, expiresAt });
  await input.sendEmail({ to: input.email, token });

  return { sent: true };
}
