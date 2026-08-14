import { alternarPanicoDoEvento } from "@albora/db";
import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { wallFromRequest } from "@/lib/wall";

export const dynamic = "force-dynamic";

/**
 * Pausa ou retoma a parede a partir do telão (spec 011).
 *
 * O crachá da TV só lê mídia — exceto este único toggle de segurança, para
 * quem está no salão não precisar abrir o admin.
 */
export async function PATCH(req: Request) {
  const configError = requireConfig("parede");
  if (configError) return configError;

  const parede = await wallFromRequest(req);
  if (!parede) {
    return errorResponse(401, "parede.invalida", "Crachá do telão inválido ou expirado");
  }

  const limite = consume(`parede_panico:${parede.eventoId}`, 30, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const panico = await alternarPanicoDoEvento(getPool(), parede.eventoId);
    if (panico === null) {
      return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
    }

    console.log("parede.panico_alternado", { eventoId: parede.eventoId, panico });
    return jsonOk({ panico });
  } catch (e) {
    return unexpectedError("parede.panico", e);
  }
}
