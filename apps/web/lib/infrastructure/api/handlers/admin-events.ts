import {
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { createEvent } from "@/lib/application/use-cases/admin";
import { createEventSchema, type CreateEventBody } from "@/lib/infrastructure/api/validators";

/** Cria evento (spec 009): conta da sessão de host, nunca do corpo; `packId` validado antes do banco (422, não 500 de FK); `coupleEmail` ≠ conta logada (guard + defesa em `criarEvento`); magic link entregue por e-mail, nunca no corpo. */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, {
    code: "admin.sem_sessao",
    message: "Entre no painel para criar um evento",
  });
  if (auth instanceof Response) return auth;

  const limit = consume(`admin_eventos:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<CreateEventBody>(req);
  if (parsed instanceof Response) return parsed;

  const validado = createEventSchema.safeParse(parsed.data);
  if (!validado.success) {
    const firstError = validado.error.issues[0];
    return errorResponse(
      422,
      "validation_error",
      firstError?.message ?? "Dados inválidos",
      {
        campos: validado.error.issues.map((e) => e.path.join(".")),
        erros: validado.error.issues,
      },
    );
  }

  try {
    const resultado = await createEvent(
      {
        accountId: auth.host.accountId,
        sessionSecret: config().sessionSecret,
        ...validado.data,
        requestOrigin: new URL(req.url).origin,
      },
      getPool(),
    );

    if (!resultado.ok) {
      const statusCode = resultado.code === "vendor.no_access" ? 403 : 422;
      return errorResponse(statusCode, resultado.code, resultado.message, resultado.details);
    }

    return jsonOk({ eventoId: resultado.eventoId, slug: resultado.slug });
  } catch (e) {
    return unexpectedError("admin.eventos", e);
  }
}
