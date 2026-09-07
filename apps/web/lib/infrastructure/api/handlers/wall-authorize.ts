import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireGuestSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { authorizeWallPairing } from "@/lib/application/use-cases/wall";
import { validateBody } from "@/lib/infrastructure/api/middleware/validate-body";
import { authorizeWallSchema } from "@/lib/infrastructure/api/validators";

/** Autoriza telão (spec 010): evento da sessão de quem autoriza, nunca do corpo; crachá só lê público; sem sessão → 401; plano grátis recusado aqui, nunca paywall na pista. */
export async function POST(req: Request) {
  const auth = await requireGuestSession(
    req,
    "Entre no evento antes de ligar o telão",
  );
  if (auth instanceof Response) return auth;

  const limit = consume(`autorizar:${auth.rateLimitKey}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody(req);
  if (parsed instanceof Response) return parsed;

  const validated = validateBody(parsed.data, authorizeWallSchema);
  if (validated instanceof Response) return validated;

  try {
    const resultado = await authorizeWallPairing(
      {
        eventoId: auth.session.eventoId,
        sessaoId: auth.session.sessaoId,
        codigo: validated.codigo,
      },
      getPool(),
    );

    if (!resultado.ok) {
      const status = resultado.code === "plano.telao" ? 403 : 409;
      return errorResponse(status, resultado.code, resultado.message);
    }

    return jsonOk({ autorizado: true });
  } catch (e) {
    return unexpectedError("parede.autorizar", e);
  }
}
