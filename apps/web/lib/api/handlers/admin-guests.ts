import {
  comEvento,
  lerFunilAgregado,
  lerMetricasAoVivo,
} from "@albora/db";
import { decideThesis, type CodigoDaTese } from "@albora/core";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  requireConfig,
  requireHostEvent,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

/** Funil agregado e participação H1 (spec 009 B-07). Sem lista nominal. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false, mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { eventId } = await params;

  const limit = consume(`admin_convidados:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEvent(auth.host.accountId, eventId);
    if (owned instanceof Response) return owned;
    const { evento } = owned;

    const data = await comEvento(getPool(), eventId, async (c) => {
      const [metricas, funil] = await Promise.all([
        lerMetricasAoVivo(c, eventId),
        lerFunilAgregado(c, eventId),
      ]);
      return { metricas, funil };
    });

    const veredito = decideThesis({
      expectedGuests: evento.expectedGuests,
      sessoesComUpload: data.metricas.sessoesComUpload,
    });

    const ultimas = await Promise.all(
      data.metricas.ultimas.map(async (f) => ({
        id: f.id,
        criadaEm: f.criadaEm.toISOString(),
        thumb: await assinarGet(f.chaveThumb, GET_TTL_SECONDS),
      })),
    );

    return jsonOk({
      expectedGuests: evento.expectedGuests,
      totalSessoes: data.funil.totalSessoes,
      sessoesComUpload: data.metricas.sessoesComUpload,
      totalFotos: data.metricas.totalFotos,
      participacao: veredito.taxa,
      veredito: veredito.codigo as CodigoDaTese,
      degraus: data.funil.degraus,
      uploadsAntesDoFeed: data.funil.uploadsAntesDoFeed,
      uploadsDepoisDoFeed: data.funil.uploadsDepoisDoFeed,
      entradasPorVia: data.funil.entradasPorVia,
      ultimas,
    });
  } catch (e) {
    return unexpectedError("admin.convidados", e);
  }
}
