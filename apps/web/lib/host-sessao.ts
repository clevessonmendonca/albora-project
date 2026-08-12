import { resolverHostSessao, type HostResolvida } from "@albora/db";
import { banco } from "./banco";
import { config } from "./config";

/**
 * A sessão do anfitrião, do lado da rota (spec 009).
 *
 * Cookie `HttpOnly` `albora_host`, **nunca** na URL — como a do convidado, e
 * pelo mesmo guard. É outra credencial: resolve `account_id` (a camada de
 * conta), não `event_id`. Um cookie separado com nome próprio para que a sessão
 * de host e a de convidado nunca se confundam no mesmo navegador.
 */

export const COOKIE_HOST = "albora_host";

function lerCookie(req: Request, nome: string): string | null {
  const bruto = req.headers.get("cookie");
  if (!bruto) return null;
  for (const parte of bruto.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return resto.join("=") || null;
  }
  return null;
}

export function tokenDoHost(req: Request): string | null {
  return lerCookie(req, COOKIE_HOST);
}

export async function hostDaRequisicao(req: Request): Promise<HostResolvida | null> {
  const token = tokenDoHost(req);
  if (!token) return null;
  try {
    return await resolverHostSessao(banco(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

/** Para o componente de servidor, que lê o cookie sem `Request`. */
export async function hostDoToken(token: string | undefined): Promise<HostResolvida | null> {
  if (!token) return null;
  try {
    return await resolverHostSessao(banco(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

export function cookieDoHost(token: string, validadeHoras: number): string {
  const atributos = [
    `${COOKIE_HOST}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${validadeHoras * 3600}`,
  ];
  if (process.env.APP_ENV !== "dev") atributos.push("Secure");
  return atributos.join("; ");
}

export function limparCookieHost(): string {
  const atributos = [`${COOKIE_HOST}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (process.env.APP_ENV !== "dev") atributos.push("Secure");
  return atributos.join("; ");
}
