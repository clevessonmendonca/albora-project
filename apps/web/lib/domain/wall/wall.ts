import { resolverParede, type ParedeResolvida } from "@albora/db";
import { getPool } from "@/lib/db";
import { config } from "@/lib/config";

/** Credenciais do telão: ambas em cookie HttpOnly, nunca na URL — `albora_parede` (crachá só-leitura, `wall_tokens`) e `albora_pareamento` (poll até virar crachá). TV não pode subir foto. */

export const WALL_COOKIE = "albora_parede";
export const PAIRING_COOKIE = "albora_pareamento";

function lerCookie(req: Request, nome: string): string | null {
  const bruto = req.headers.get("cookie");
  if (!bruto) return null;

  for (const parte of bruto.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return resto.join("=") || null;
  }
  return null;
}

export function badgeFromRequest(req: Request): string | null {
  return lerCookie(req, WALL_COOKIE);
}

export function pollTokenFromRequest(req: Request): string | null {
  return lerCookie(req, PAIRING_COOKIE);
}

/** Resolve o crachá da requisição; `null` quando não há crachá válido — quem chama decide o status. */
export async function wallFromRequest(req: Request): Promise<ParedeResolvida | null> {
  const cracha = badgeFromRequest(req);
  if (!cracha) return null;

  try {
    return await resolverParede(getPool(), config().sessionSecret, cracha);
  } catch {
    return null;
  }
}

function cookie(nome: string, valor: string, maxAgeSegundos: number): string {
  const atributos = [
    `${nome}=${valor}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSegundos}`,
  ];
  if (process.env.APP_ENV !== "dev") atributos.push("Secure");
  return atributos.join("; ");
}

export function badgeCookie(cracha: string, validadeHoras: number): string {
  return cookie(WALL_COOKIE, cracha, validadeHoras * 3600);
}

export function pairingCookie(pollToken: string, validadeSegundos: number): string {
  return cookie(PAIRING_COOKIE, pollToken, validadeSegundos);
}

/** Zera um cookie do telão — Max-Age 0 apaga na hora. */
export function clearCookie(nome: string): string {
  return cookie(nome, "", 0);
}
