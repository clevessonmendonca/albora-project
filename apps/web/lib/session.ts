import { GUEST_SESSION_COOKIE } from "@albora/core";
import { resolveSession, type SessaoResolvida } from "@albora/db";
import { getPool } from "./db";
import { config } from "./config";

export { GUEST_SESSION_COOKIE };

/** Token em cookie `HttpOnly`, nunca na URL — na URL vaza por referer, histórico e print; `sessao` guard do CI reprova querystring com token. */
export function sessionCookieHeader(token: string, durationHours: number): string {
  const attrs = [
    `${GUEST_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${durationHours * 3600}`,
  ];

  // Sem Secure em dev, senão o cookie não gruda em http://localhost e o fluxo parece quebrado por outro motivo.
  if (process.env.APP_ENV !== "dev") attrs.push("Secure");

  return attrs.join("; ");
}

export function tokenFromRequest(req: Request): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;

  for (const part of raw.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === GUEST_SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

/** Resolve a sessão da requisição; `null` quando inválida — quem chama decide o status, "sem cookie" e "token inválido" têm a mesma resposta mas significados diferentes no log. */
export async function guestSessionFromRequest(req: Request): Promise<SessaoResolvida | null> {
  const token = tokenFromRequest(req);
  if (!token) return null;

  try {
    return await resolveSession(getPool(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

/** Mesma resolução a partir do cookie já lido (componente de servidor não recebe `Request`); as duas terminam em `resolveSession` — uma forma de ler = uma chance de errar. */
export async function guestSessionFromToken(
  token: string | undefined,
): Promise<SessaoResolvida | null> {
  if (!token) return null;

  try {
    return await resolveSession(getPool(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

/** Chave de rate limit. Cai para o IP quando ainda não há sessão. */
export function limitIdentity(req: Request, session: SessaoResolvida | null): string {
  if (session) return `s:${session.sessaoId}`;
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  return `ip:${ip.split(",")[0]!.trim()}`;
}
