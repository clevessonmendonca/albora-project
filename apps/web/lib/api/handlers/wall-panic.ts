import { alternarPanicoDoEvento } from "@albora/db";
import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { wallFromRequest } from "@/lib/wall";

/** Pausa/retoma a parede a partir do telão (spec 011): único toggle do crachá da TV — quem está no salão não precisa abrir o admin. */
export async function PATCH(req: Request) {
  const configError = requireConfig("parede");
  if (configError) return configError;

  const wall = await wallFromRequest(req);
  if (!wall) {
    return errorResponse(401, "parede.invalida", "Crachá do telão inválido ou expirado");
  }

  const limit = consume(`parede_panico:${wall.eventoId}`, 30, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const panico = await alternarPanicoDoEvento(getPool(), wall.eventoId);
    if (panico === null) {
      return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
    }

    console.log("parede.panico_alternado", { eventoId: wall.eventoId, panico });
    return jsonOk({ panico });
  } catch (e) {
    return unexpectedError("parede.panico", e);
  }
}
