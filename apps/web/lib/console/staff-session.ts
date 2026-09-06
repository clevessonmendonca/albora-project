import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import type { Actor, StaffRole } from "@albora/core";
import {
  assinaturaValida,
  createStaffSession,
  emitirToken,
  findSessionEvenIfRevoked,
  findStaffById,
  hashDoToken,
  insertSecurityEvent,
  listStaffRoles,
  markReauthenticated,
  resolveStaffSession,
  revokeSessionChain,
  revokeStaffSession,
  touchStaffSession,
} from "@albora/db";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";

/**
 * Sessão de staff: cookie HttpOnly `albora_staff`, TTL absoluto de 12h e
 * ociosidade de 30min. Onde moram os freios que a sessão de anfitrião não
 * precisa ter — rotação de token e detecção de reuso de token revogado — porque
 * aqui quem se autentica tem acesso a PII de todas as contas, não a uma conta só.
 */

export const STAFF_COOKIE = "albora_staff";
export const ABSOLUTE_TTL_SECONDS = 12 * 60 * 60;
export const IDLE_TTL_SECONDS = 30 * 60;

function cookieAttrs(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: process.env.APP_ENV !== "dev",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Emite sessão nova, grava o cookie e devolve o hash (hex) — quem chama rotacionando precisa do hash pra montar o Actor sem reler o cookie. */
export async function issueStaffSession(staffUserId: string, rotatedFrom?: string): Promise<string> {
  const { sessionSecret } = config();
  const { token, hash } = emitirToken(sessionSecret);
  const tokenHash = hash.toString("hex");
  const expiresAt = new Date(Date.now() + ABSOLUTE_TTL_SECONDS * 1000);

  await createStaffSession(getPool(), {
    staffUserId,
    tokenHash,
    expiresAt,
    ...(rotatedFrom ? { rotatedFrom } : {}),
  });

  const jar = await cookies();
  jar.set(STAFF_COOKIE, token, cookieAttrs(ABSOLUTE_TTL_SECONDS));

  return tokenHash;
}

export async function clearStaffSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;

  if (token) {
    const { sessionSecret } = config();
    if (assinaturaValida(sessionSecret, token)) {
      await revokeStaffSession(getPool(), hashDoToken(token).toString("hex"));
    }
  }

  jar.set(STAFF_COOKIE, "", cookieAttrs(0));
}

export async function markStaffReauthenticated(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (!token) return;

  const { sessionSecret } = config();
  if (!assinaturaValida(sessionSecret, token)) return;

  await markReauthenticated(getPool(), hashDoToken(token).toString("hex"));
}

/** Rotaciona quando a sessão passou de metade do TTL absoluto: nova linha com `rotated_from`, revoga a antiga, troca o cookie. Devolve o hash que vale a partir de agora. */
async function rotateIfNeeded(tokenHash: string, staffUserId: string, createdAt: Date): Promise<string> {
  const idadeMs = Date.now() - createdAt.getTime();
  if (idadeMs < (ABSOLUTE_TTL_SECONDS * 1000) / 2) return tokenHash;

  const pool = getPool();
  await revokeStaffSession(pool, tokenHash);
  return issueStaffSession(staffUserId, tokenHash);
}

export async function resolveActor(): Promise<Actor | null> {
  const jar = await cookies();
  const token = jar.get(STAFF_COOKIE)?.value;
  if (!token) return null;

  const { sessionSecret } = config();
  // Assinatura inválida é rejeitada aqui — microssegundos, sem ida ao banco.
  if (!assinaturaValida(sessionSecret, token)) return null;

  const tokenHash = hashDoToken(token).toString("hex");
  const pool = getPool();
  const resolved = await resolveStaffSession(pool, tokenHash, { idleMaxSeconds: IDLE_TTL_SECONDS });

  if (!resolved) {
    // Não resolveu: se a linha existe e está revogada, é reuso de um token já
    // rotacionado — sinal de roubo. Mata a cadeia inteira, não só este token.
    const evenRevoked = await findSessionEvenIfRevoked(pool, tokenHash);
    if (evenRevoked?.revokedAt) {
      const quantas = await revokeSessionChain(pool, tokenHash);
      await insertSecurityEvent(pool, {
        kind: "session.reuse",
        actorKind: "staff",
        metadata: { revokedCount: quantas },
      });
    }
    return null;
  }

  await touchStaffSession(pool, tokenHash);
  const sessionIdAtual = await rotateIfNeeded(tokenHash, resolved.staffUserId, resolved.createdAt);

  const staffUser = await findStaffById(pool, resolved.staffUserId);
  if (!staffUser || staffUser.status !== "active") return null;

  const roles = await listStaffRoles(pool, resolved.staffUserId);

  return {
    staffUserId: resolved.staffUserId,
    roles: roles as StaffRole[],
    sessionId: sessionIdAtual,
    requestId: randomUUID(),
    reauthenticatedAt: resolved.reauthenticatedAt,
  };
}
