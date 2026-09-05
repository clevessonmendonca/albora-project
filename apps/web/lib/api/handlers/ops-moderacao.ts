import { listEventsWithPendingModeration } from "@albora/db";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { classifyPendingForEventNow } from "@/lib/classify-media";
import { getAggregatorPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Teto de segurança contra loop infinito — um evento com backlog gigante drena aos poucos, em varreduras seguintes, não trava este request. */
const RODADAS_MAX_POR_EVENTO = 5;

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Rede de segurança da Task 6: o disparo principal de classificação é o
 * confirm do upload (`enqueueModeration`), e o telão ainda reforça quando
 * está aberto (`classifyMediaAfter` em `handlers/wall.ts`). Nenhum dos dois
 * garante sozinho que a fila drena — se o confirm falhou ao enfileirar
 * (degradado, não bloqueia) ou se o telão nunca abriu, a mídia fica
 * `pending` pra sempre sem este job. Listagem cross-evento via
 * `getAggregatorPool()` (BYPASSRLS), mesmo papel de `listDueRetentionJobs`;
 * o processamento em si roda por evento com RLS normal, dentro de
 * `classifyPendingForEventNow`.
 */
export async function postOpsModeracao(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  try {
    const eventos = await listEventsWithPendingModeration(getAggregatorPool());

    let processados = 0;
    for (const eventoId of eventos) {
      for (let rodada = 0; rodada < RODADAS_MAX_POR_EVENTO; rodada++) {
        const n = await classifyPendingForEventNow(eventoId);
        processados += n;
        if (n === 0) break;
      }
    }

    console.log("moderacao.sweep", { eventos: eventos.length, processados });
    return jsonOk({ eventos: eventos.length, processados });
  } catch (e) {
    return unexpectedError("ops.moderacao", e);
  }
}
