import { resolverParede, type ParedeResolvida } from "@albora/db";
import { banco } from "./banco";
import { config } from "./config";

/**
 * O crachá da parede, do lado da rota.
 *
 * Chega em `Authorization: Bearer <crachá>`, **nunca** em querystring: o guard
 * `sessao` reprova `?token=` porque vaza por referrer e log de proxy, e o
 * crachá é credencial como qualquer outra. Na URL do telão ele aparece uma vez
 * só — quando o anfitrião abre o link na TV — e o cliente o tira da barra de
 * endereço antes do primeiro quadro.
 *
 * Resolve pela `wall_tokens`, não pela `session_tokens`: mesma assinatura, tabela
 * diferente, e por isso autoriza só leitura. Uma TV pendurada num salão é a
 * credencial mais fácil de furtar do produto; ela não pode subir foto.
 */
export function crachaDaRequisicao(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth) return null;

  const [esquema, valor] = auth.split(" ");
  if (esquema?.toLowerCase() !== "bearer" || !valor) return null;

  return valor;
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
