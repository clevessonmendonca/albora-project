import { resolverParede, type ParedeResolvida } from "@albora/db";
import { banco } from "./banco";
import { config } from "./config";

/**
 * As credenciais do telão, do lado da rota.
 *
 * Duas, ambas em cookie `HttpOnly` — **nunca** na URL, que o guard `sessao`
 * reprova porque vaza por referrer e log de proxy:
 *
 * - `albora_parede`: o crachá de leitura. A TV o recebe ao fim do pareamento e
 *   o navegador o manda sozinho em cada poll de `/api/parede`. Só lê.
 * - `albora_pareamento`: o token de poll, secreto de máquina. Vive enquanto o
 *   pareamento está aberto e some quando vira crachá.
 *
 * O crachá resolve pela `wall_tokens`, não pela `session_tokens`: mesma
 * assinatura, tabela diferente, e por isso autoriza só leitura. Uma TV
 * pendurada num salão não pode subir foto.
 */

export const COOKIE_PAREDE = "albora_parede";
export const COOKIE_PAREAMENTO = "albora_pareamento";

function lerCookie(req: Request, nome: string): string | null {
  const bruto = req.headers.get("cookie");
  if (!bruto) return null;

  for (const parte of bruto.split(";")) {
    const [chave, ...resto] = parte.trim().split("=");
    if (chave === nome) return resto.join("=") || null;
  }
  return null;
}

export function crachaDaRequisicao(req: Request): string | null {
  return lerCookie(req, COOKIE_PAREDE);
}

export function pollTokenDaRequisicao(req: Request): string | null {
  return lerCookie(req, COOKIE_PAREAMENTO);
}

/**
 * Resolve o crachá da requisição. `null` quando não há crachá válido — quem
 * chama decide o status, do mesmo jeito que `sessaoDaRequisicao`.
 */
export async function paredeDaRequisicao(req: Request): Promise<ParedeResolvida | null> {
  const cracha = crachaDaRequisicao(req);
  if (!cracha) return null;

  try {
    return await resolverParede(banco(), config().sessionSecret, cracha);
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

export function cookieDoCracha(cracha: string, validadeHoras: number): string {
  return cookie(COOKIE_PAREDE, cracha, validadeHoras * 3600);
}

export function cookieDoPareamento(pollToken: string, validadeSegundos: number): string {
  return cookie(COOKIE_PAREAMENTO, pollToken, validadeSegundos);
}

/** Zera um cookie do telão — Max-Age 0 apaga na hora. */
export function limparCookie(nome: string): string {
  return cookie(nome, "", 0);
}
