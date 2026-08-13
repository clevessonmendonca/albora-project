import {
  comEvento,
  lerFunilAgregado,
  lerMetricasAoVivo,
} from "@albora/db";
import { decidirTese, type CodigoDaTese } from "@albora/core";
import {
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

export const dynamic = "force-dynamic";

const VALIDADE_GET_SEGUNDOS = 900;

const ADMIN_SESSAO = {
  code: "admin.sem_sessao",
  message: "Entre no painel para continuar",
} as const;

/** Funil agregado e participação H1 (spec 009 B-07). Sem lista nominal. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ eventoId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false, mediaOrigin: true });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSAO);
  if (auth instanceof Response) return auth;

  const { eventoId } = await params;

  const limite = consume(`admin_convidados:${auth.host.accountId}`, 60, 60, Date.now());
  if (!limite.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limite.resetInSeconds,
    });
  }

  try {
    const owned = await requireHostEvent(auth.host.accountId, eventoId);
    if (owned instanceof Response) return owned;
    const { evento } = owned;

    const dados = await comEvento(getPool(), eventoId, async (c) => {
      const [metricas, funil] = await Promise.all([
        lerMetricasAoVivo(c, eventoId),
        lerFunilAgregado(c, eventoId),
      ]);
      return { metricas, funil };
    });

    const veredito = decidirTese({
      expectedGuests: evento.expectedGuests,
      sessoesComUpload: dados.metricas.sessoesComUpload,
    });

    const ultimas = await Promise.all(
      dados.metricas.ultimas.map(async (f) => ({
        id: f.id,
        criadaEm: f.criadaEm.toISOString(),
        thumb: await assinarGet(f.chaveThumb, VALIDADE_GET_SEGUNDOS),
      })),
    );

    return jsonOk({
      expectedGuests: evento.expectedGuests,
      totalSessoes: dados.funil.totalSessoes,
      sessoesComUpload: dados.metricas.sessoesComUpload,
      totalFotos: dados.metricas.totalFotos,
      participacao: veredito.taxa,
      veredito: veredito.codigo as CodigoDaTese,
      degraus: dados.funil.degraus,
      ultimas,
    });
  } catch (e) {
    return unexpectedError("admin.convidados", e);
  }
}
