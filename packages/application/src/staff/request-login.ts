import type { Pool } from "pg";
import { createStaffMagicLink, findStaffByEmail, insertSecurityEvent } from "@albora/db";
import { consumeRateLimit } from "./rate-limit";
import { generateStaffMagicLinkToken } from "./token";

export const MAGIC_LINK_TTL_MINUTES = 15;
const MAX_REQUESTS_PER_EMAIL_PER_HOUR = 5;
const MAX_REQUESTS_PER_IP_PER_HOUR = 5;

export type RequestStaffLoginInput = {
  email: string;
  ipHash: string;
  sendEmail: (input: { to: string; token: string }) => Promise<void> | void;
};

export type RequestStaffLoginResult = { sent: true };

/**
 * Porta de entrada do back-office. Devolve `{ sent: true }` exista ou não o
 * e-mail — anti-enumeração: uma resposta diferente para e-mail inexistente
 * transformaria a tela de login num oráculo que enumera a equipe inteira.
 * Estouro de rate limit (por e-mail E por IP) grava `security_events` e
 * ainda assim devolve a mesma resposta, para não virar o oráculo que a
 * anti-enumeração acabou de fechar.
 */
export async function requestStaffLogin(pool: Pool, input: RequestStaffLoginInput): Promise<RequestStaffLoginResult> {
  const email = input.email.trim().toLowerCase();

  const withinLimit =
    consumeRateLimit(`email:${email}`, MAX_REQUESTS_PER_EMAIL_PER_HOUR, 3600) &&
    consumeRateLimit(`ip:${input.ipHash}`, MAX_REQUESTS_PER_IP_PER_HOUR, 3600);

  if (!withinLimit) {
    await insertSecurityEvent(pool, {
      kind: "rate_limit.exceeded",
      ipHash: input.ipHash,
      metadata: { surface: "staff_login" },
    });
    return { sent: true };
  }

  const staff = await findStaffByEmail(pool, email);
  if (staff && staff.status === "active") {
    const { token, tokenHash } = generateStaffMagicLinkToken();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000);

    await createStaffMagicLink(pool, { staffUserId: staff.id, tokenHash, expiresAt });
    await input.sendEmail({ to: email, token });
  }

  return { sent: true };
}
