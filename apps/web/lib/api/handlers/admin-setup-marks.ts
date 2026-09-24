import {
  ehMarcoDePreparo,
  marcarItemDoChecklist,
  marcarPassoDoTour,
  marcarPreparoDoEvento,
} from "@albora/db";
import { ehItemManualDoChecklist } from "@/features/admin/lib/pre-event-checklist";
import {
  ADMIN_SESSION_REQUIRED,
  ANY_HOST_ROLES,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostEventRole,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type Corpo = { marco?: unknown; tour?: unknown; checklist?: unknown };

/**
 * Registra um marco de preparo do evento (0074) — identidade revisada, QR
 * preparado, prévia de convidado vista. São os passos que não deixam rastro
 * próprio; guardá-los no evento (e não no navegador) é o que deixa o painel
 * dizer "4 de 6 prontos" sem mentir quando o casal troca de aparelho.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin");
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limite = consume(`admin_preparo:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Corpo>(req);
  if (parsed instanceof Response) return parsed;

  const marco = parsed.data.marco;
  // O tour não é um marco de preparo: guarda um passo, não um "feito".
  const tour = parsed.data.tour;
  const ehTour = tour === true || (typeof tour === "number" && Number.isInteger(tour) && tour >= 0);

  // O checklist operacional usa a mesma coluna, em chave própria: são 23 itens
  // de logística, não os essenciais que o contador da home soma.
  const checklist = parsed.data.checklist;
  const item =
    typeof checklist === "object" && checklist !== null
      ? (checklist as { item?: unknown; feito?: unknown })
      : null;

  if (item && (typeof item.item !== "string" || !ehItemManualDoChecklist(item.item))) {
    return errorResponse(422, "validation_error", "Item de checklist desconhecido", {
      campos: ["checklist.item"],
    });
  }

  if (item && typeof item.feito !== "boolean") {
    return errorResponse(422, "validation_error", "Informe se o item está feito", {
      campos: ["checklist.feito"],
    });
  }

  if (!ehTour && !item && (typeof marco !== "string" || !ehMarcoDePreparo(marco))) {
    return errorResponse(422, "validation_error", "Marco desconhecido", { campos: ["marco"] });
  }

  const access = await requireHostEventRole(auth.host.accountId, eventId, ANY_HOST_ROLES);
  if (access instanceof Response) return access;

  if (item) {
    try {
      const evento = await marcarItemDoChecklist(
        getPool(),
        auth.host.accountId,
        eventId,
        item.item as string,
        item.feito as boolean,
      );
      if (!evento) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
      return jsonOk({ marcosDePreparo: evento.marcosDePreparo });
    } catch (e) {
      return unexpectedError("admin.preparo", e);
    }
  }

  if (ehTour) {
    try {
      const evento = await marcarPassoDoTour(
        getPool(),
        auth.host.accountId,
        eventId,
        tour as number | true,
      );
      if (!evento) return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
      return jsonOk({ marcosDePreparo: evento.marcosDePreparo });
    } catch (e) {
      return unexpectedError("admin.preparo", e);
    }
  }

  try {
    const evento = await marcarPreparoDoEvento(
      getPool(),
      auth.host.accountId,
      eventId,
      marco as Parameters<typeof marcarPreparoDoEvento>[3],
    );
    if (!evento) {
      return errorResponse(404, "evento.nao_encontrado", "Evento não encontrado");
    }
    return jsonOk({ marcosDePreparo: evento.marcosDePreparo });
  } catch (e) {
    return unexpectedError("admin.preparo", e);
  }
}
