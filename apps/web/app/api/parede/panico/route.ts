import { alternarPanicoDoEvento } from "@albora/db";
import { banco } from "@/lib/banco";
import { config, ErroConfig } from "@/lib/config";
import { consumir } from "@/lib/limite";
import { paredeDaRequisicao } from "@/lib/parede";
import { erro, erroInesperado, ok } from "@/lib/resposta";

export const dynamic = "force-dynamic";

/**
 * Pausa ou retoma a parede a partir do telão (spec 011).
 *
 * O crachá da TV só lê mídia — exceto este único toggle de segurança, para
 * quem está no salão não precisar abrir o admin.
 */
export async function PATCH(req: Request) {
  try {
    config();
  } catch (e) {
    if (e instanceof ErroConfig) {
      console.error("parede.config_ausente", { faltando: e.faltando });
      return erro(503, "config.missing", "Serviço indisponível");
    }
    throw e;
  }

  const parede = await paredeDaRequisicao(req);
  if (!parede) return erro(401, "parede.invalida", "Crachá do telão inválido ou expirado");

  const limite = consumir(`parede_panico:${parede.eventoId}`, 30, 60, Date.now());
  if (!limite.permitido) {
    return erro(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetEmSegundos,
    });
  }

  try {
    const panico = await alternarPanicoDoEvento(banco(), parede.eventoId);
    if (panico === null) return erro(404, "evento.nao_encontrado", "Evento não encontrado");

    console.log("parede.panico_alternado", { eventoId: parede.eventoId, panico });
    return ok({ panico });
  } catch (e) {
    return erroInesperado("parede.panico", e);
  }
}
