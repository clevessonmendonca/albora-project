import { resolverSessao, type SessaoResolvida } from "@albora/db";
import { getPool } from "./db";
import { config } from "./config";

export const GUEST_SESSION_COOKIE = "albora_sessao";

/**
 * O token vive em cookie `HttpOnly`, e **nunca na URL**.
 *
 * Na URL ele vaza por referer, histórico, print de tela e no grupo do
 * WhatsApp — que é literalmente o segundo canal de distribuição do evento.
 * O guard `sessao` do CI reprova querystring com token.
 */
export function sessionCookieHeader(token: string, durationHours: number): string {
  const attrs = [
    `${GUEST_SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${durationHours * 3600}`,
  ];

  // Sem Secure em dev, senão o cookie não gruda em http://localhost e o
  // fluxo inteiro parece quebrado por um motivo que não é o real.
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

/**
 * Resolve a sessão da requisição. Devolve `null` quando não há sessão válida
 * — quem chama decide o status, porque "sem cookie" e "token inválido" têm a
 * mesma resposta para o cliente e significados diferentes no log.
 */
export async function guestSessionFromRequest(req: Request): Promise<SessaoResolvida | null> {
  const token = tokenFromRequest(req);
  if (!token) return null;

  try {
    return await resolverSessao(getPool(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

/**
 * A mesma resolução, a partir do cookie já lido pelo servidor.
 *
 * Existe para o componente de servidor, que não recebe `Request`. Uma segunda
 * forma de ler o token seria uma segunda chance de errar — por isso as duas
 * terminam em `resolverSessao`.
 */
export async function guestSessionFromToken(
  token: string | undefined,
): Promise<SessaoResolvida | null> {
  if (!token) return null;

  try {
    return await resolverSessao(getPool(), config().sessionSecret, token);
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
