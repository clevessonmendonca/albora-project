import { listEventsWithOrphanedUploads, listEventsWithPendingModeration } from "@albora/db";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { classifyPendingForEventNow, enqueueOrphanedUploadsForEventNow } from "@/lib/classify-media";
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
 * garante sozinho que a fila drena — se o telão nunca abriu, a mídia fica
 * `pending` até este job passar. E se o confirm falhou ao enfileirar
 * (degradado, não bloqueia — `confirm-upload.ts`), a mídia nem chega a
 * existir em `photo_moderation`: por isso este job também varre
 * `listEventsWithOrphanedUploads` (uploads publicados sem veredito, direto
 * em `uploads`) e reenfileira o que achar (`enqueueOrphanedUploadsForEventNow`,
 * idempotente) antes de drenar a fila normalmente. Listagem cross-evento via
 * `getAggregatorPool()` (BYPASSRLS), mesmo papel de `listDueRetentionJobs`;
 * o processamento em si roda por evento com RLS normal.
 */
export async function postOpsModeracao(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  try {
    const [eventosDaFila, eventosOrfaos] = await Promise.all([
      listEventsWithPendingModeration(getAggregatorPool()),
      listEventsWithOrphanedUploads(getAggregatorPool()),
    ]);
    const eventos = Array.from(new Set([...eventosDaFila, ...eventosOrfaos]));

    let enfileirados = 0;
    for (const eventoId of eventos) {
      enfileirados += await enqueueOrphanedUploadsForEventNow(eventoId);
    }

    let processados = 0;
    for (const eventoId of eventos) {
      for (let rodada = 0; rodada < RODADAS_MAX_POR_EVENTO; rodada++) {
        const n = await classifyPendingForEventNow(eventoId);
        processados += n;
        if (n === 0) break;
      }
    }

    console.log("moderacao.sweep", { eventos: eventos.length, enfileirados, processados });
    return jsonOk({ eventos: eventos.length, enfileirados, processados });
  } catch (e) {
    return unexpectedError("ops.moderacao", e);
  }
}
