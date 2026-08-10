import { resolverSessao, type SessaoResolvida } from "@albora/db";
import { banco } from "./banco";
import { config } from "./config";

export const COOKIE_SESSAO = "albora_sessao";

/**
 * O token vive em cookie `HttpOnly`, e **nunca na URL**.
 *
 * Na URL ele vaza por referer, histórico, print de tela e no grupo do
 * WhatsApp — que é literalmente o segundo canal de distribuição do evento.
 * O guard `sessao` do CI reprova querystring com token.
 */
export function cabecalhoDeCookie(token: string, duracaoHoras: number): string {
  const atributos = [
    `${COOKIE_SESSAO}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${duracaoHoras * 3600}`,
  ];

  // Sem Secure em dev, senão o cookie não gruda em http://localhost e o
  // fluxo inteiro parece quebrado por um motivo que não é o real.
  if (process.env.APP_ENV !== "dev") atributos.push("Secure");

  return atributos.join("; ");
}

export function tokenDaRequisicao(req: Request): string | null {
  const bruto = req.headers.get("cookie");
  if (!bruto) return null;

  for (const parte of bruto.split(";")) {
    const [nome, ...resto] = parte.trim().split("=");
    if (nome === COOKIE_SESSAO) return resto.join("=") || null;
  }
  return null;
}

/**
 * Resolve a sessão da requisição. Devolve `null` quando não há sessão válida
 * — quem chama decide o status, porque "sem cookie" e "token inválido" têm a
 * mesma resposta para o cliente e significados diferentes no log.
 */
export async function sessaoDaRequisicao(req: Request): Promise<SessaoResolvida | null> {
  const token = tokenDaRequisicao(req);
  if (!token) return null;

  try {
    return await resolverSessao(banco(), config().sessionSecret, token);
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
export async function sessaoDoToken(token: string | undefined): Promise<SessaoResolvida | null> {
  if (!token) return null;

  try {
    return await resolverSessao(banco(), config().sessionSecret, token);
  } catch {
    return null;
  }
}

/** Chave de rate limit. Cai para o IP quando ainda não há sessão. */
export function identidadeParaLimite(req: Request, sessao: SessaoResolvida | null): string {
  if (sessao) return `s:${sessao.sessaoId}`;
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for") ?? "sem-ip";
  return `ip:${ip.split(",")[0]!.trim()}`;
}
