import { resolverHostSessao, type HostResolvida } from "@albora/db";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";

/** Sessão do anfitrião: cookie HttpOnly `albora_host`, nunca na URL; resolve `account_id`, não `event_id` — nome próprio para não confundir com a sessão do convidado. */

export const HOST_COOKIE = "albora_host";

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=") || null;
  }
  return null;
}

export function hostTokenFromRequest(req: Request): string | null {
  return readCookie(req, HOST_COOKIE);
}

export async function hostFromRequest(req: Request): Promise<HostResolvida | null> {
  const token = hostTokenFromRequest(req);
  if (!token) return null;
  try {
    return await resolverHostSessao(getPool(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

/** Para o componente de servidor, que lê o cookie sem `Request`. */
export async function hostFromToken(token: string | undefined): Promise<HostResolvida | null> {
  if (!token) return null;
  try {
    return await resolverHostSessao(getPool(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

export function hostCookie(token: string, validityHours: number): string {
  const attrs = [
    `${HOST_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${validityHours * 3600}`,
  ];
  if (process.env.APP_ENV !== "dev") attrs.push("Secure");
  return attrs.join("; ");
}

export function clearHostCookie(): string {
  const attrs = [`${HOST_COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.APP_ENV !== "dev") attrs.push("Secure");
  return attrs.join("; ");
}
