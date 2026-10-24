import { podeUsarTelao } from "@albora/core";
import { criarPareamentoPorLink } from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { config } from "@/lib/config";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

export const WALL_LINK_TTL_SECONDS = 20 * 60;
const WALL_LINK_CONSENT_VERSION = "1";

/** O anfitrião gera um link de uso único para o telão: a autorização é dele, o evento sai da sessão e o segredo vai só no fragmento da URL. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;
  const owned = await requireHostEvent(auth.host.accountId, eventId);
  if (owned instanceof Response) return owned;

  const limit = consume(`telao_link:${auth.host.accountId}`, 10, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  if (!podeUsarTelao(owned.evento.plan)) {
    return errorResponse(
      403,
      "plano.telao",
      "O telão entra no plano Completo. Dá para subir de plano aqui no painel.",
    );
  }

  try {
    const expiraEm = new Date(Date.now() + WALL_LINK_TTL_SECONDS * 1000);
    const { linkToken } = await criarPareamentoPorLink(
      getPool(),
      config().sessionSecret,
      eventId,
      WALL_LINK_CONSENT_VERSION,
      expiraEm,
    );

    console.log("parede.link_criado", { eventoId: eventId, expiraEm: expiraEm.toISOString() });

    const origem = new URL(req.url).origin;
    return jsonOk(
      { url: `${origem}/wall-link#${linkToken}`, expiraEm: expiraEm.toISOString() },
      { status: 201, headers: { "cache-control": "no-store" } },
    );
  } catch (e) {
    return unexpectedError("parede.link", e);
  }
}
