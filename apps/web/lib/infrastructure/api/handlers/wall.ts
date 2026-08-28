import { errorResponse, jsonOk, requireConfig, unexpectedError } from "@/lib/api";
import { classifyMediaAfter } from "@/lib/classify-media";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { wallFromRequest } from "@/lib/wall";
import { getWallFeed } from "@/lib/application/use-cases/wall";

/** Parede: crachá não sessão (TV pendurada no salão); evento do crachá, nunca da URL; servidor assina URL, TV busca direto no storage; falha fechada — `published` segura NULL/suspeito. */
export async function GET(req: Request) {
  const configError = requireConfig("parede", { mediaOrigin: true });
  if (configError) return configError;

  const wall = await wallFromRequest(req);
  if (!wall) {
    return errorResponse(401, "parede.invalida", "Crachá do telão inválido ou expirado");
  }

  const limit = consume(`parede:${wall.eventoId}`, 240, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  classifyMediaAfter(wall.eventoId);

  try {
    const resultado = await getWallFeed({ eventoId: wall.eventoId }, getPool());

    return jsonOk({
      itens: resultado.itens,
      expiraEm: resultado.expiraEm,
      panico: resultado.panico,
      telaoModelos: resultado.telaoModelos,
      contadores: resultado.contadores,
    });
  } catch (e) {
    return unexpectedError("parede", e);
  }
}
