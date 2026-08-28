import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { wallFromRequest } from "@/lib/wall";
import { toggleWallPanic } from "@/lib/application/use-cases/wall";

/** Pausa/retoma a parede a partir do telão (spec 011): único toggle do crachá da TV — quem está no salão não precisa abrir o admin. */
export async function PATCH(req: Request) {
  const configError = requireConfig("parede");
  if (configError) return configError;

  const wall = await wallFromRequest(req);
  if (!wall) {
    return errorResponse(
      401,
      "parede.invalida",
      "Crachá do telão inválido ou expirado",
    );
  }

  const limit = consume(
    `parede_panico:${wall.eventoId}`,
    30,
    60,
    Date.now(),
  );
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const resultado = await toggleWallPanic(
      { eventoId: wall.eventoId },
      getPool(),
    );

    if (!resultado.ok) {
      return errorResponse(404, resultado.code, "Evento não encontrado");
    }

    return jsonOk({ panico: resultado.panico });
  } catch (e) {
    return unexpectedError("parede.panico", e);
  }
}
