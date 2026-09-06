import {
  claimCurationJobs,
  completeCurationJob,
  failCurationJob,
  listEventsWithPendingCuration,
  listUploadsAwaitingCurationScore,
  reclaimStaleCurationJob,
  withEvent,
} from "@albora/db";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { getAggregatorPool, getPool } from "@/lib/db";
import { curatePendingForEventNow } from "@/lib/domain/media/curate";

export const dynamic = "force-dynamic";

/** Teto de segurança contra loop infinito — um evento com backlog gigante drena aos poucos, em varreduras seguintes (o job fica `processing`; a próxima varredura o reivindica de novo via reclaim), não trava este request. */
const RODADAS_MAX_POR_EVENTO = 5;
const RECLAIM_APOS_SEGUNDOS = 600;
const MAX_ATTEMPTS = 3;

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

type ResultadoEvento = "processado" | "sem_job" | "falhou";

/**
 * Claim de curation_jobs é por evento (uma linha por evento, `UNIQUE (event_id)`) — nunca cruza
 * eventos, diferente da listagem acima (`listEventsWithPendingCuration`, `BYPASSRLS`). Reclaim
 * roda antes do claim: se o job estava preso em `processing` além do prazo (processo morto),
 * ele volta a `pending` a tempo de ser reivindicado nesta mesma passada.
 *
 * Falha de UM item de mídia nunca chega aqui — `curatePendingForEventNow` já degrada para score
 * ausente e nunca lança. `failCurationJob` só é acionado por um erro sistêmico (banco fora do ar,
 * por exemplo), não por uma mídia individual.
 */
async function processarEvento(eventoId: string): Promise<ResultadoEvento> {
  const pool = getPool();

  await withEvent(pool, eventoId, (c) => reclaimStaleCurationJob(c, eventoId, RECLAIM_APOS_SEGUNDOS));

  const [job] = await withEvent(pool, eventoId, (c) => claimCurationJobs(c, eventoId));
  if (!job) return "sem_job";

  try {
    for (let rodada = 0; rodada < RODADAS_MAX_POR_EVENTO; rodada++) {
      const n = await curatePendingForEventNow(eventoId);
      if (n === 0) break;
    }

    const restantes = await withEvent(pool, eventoId, (c) =>
      listUploadsAwaitingCurationScore(c, eventoId, 1),
    );
    if (restantes.length === 0) {
      await withEvent(pool, eventoId, (c) => completeCurationJob(c, job.id));
    }
    // Backlog maior que o teto de rodadas: o job fica `processing` e a próxima
    // varredura retoma de onde parou, via `reclaimStaleCurationJob`.

    return "processado";
  } catch (e) {
    console.error("curadoria.evento_falhou", { eventoId, erro: String(e) });
    await withEvent(pool, eventoId, (c) => failCurationJob(c, job.id, MAX_ATTEMPTS, String(e))).catch(
      () => {},
    );
    return "falhou";
  }
}

/**
 * Rede de segurança pós-evento (spec §4b): calcula os três sinais de curadoria — hash
 * perceptual, nitidez, exposição — sobre o thumb de cada mídia publicada, propondo ordem para o
 * editor do livro. Nunca decide sozinho, nunca remove mídia (`@albora/curation`). Listagem via
 * `getAggregatorPool()` (BYPASSRLS, cruza eventos, só leitura); processamento por evento via
 * `getPool()` com `SET LOCAL`, mesmo molde de `ops-retencao.ts` e `ops-moderacao.ts`.
 */
export async function postOpsCuradoria(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  try {
    const eventos = await listEventsWithPendingCuration(getAggregatorPool());

    let processados = 0;
    let semJob = 0;
    let falhas = 0;

    for (const eventoId of eventos) {
      const resultado = await processarEvento(eventoId);
      if (resultado === "processado") processados++;
      else if (resultado === "sem_job") semJob++;
      else falhas++;
    }

    console.log("curadoria.sweep", { eventos: eventos.length, processados, semJob, falhas });
    return jsonOk({ eventos: eventos.length, processados, semJob, falhas });
  } catch (e) {
    return unexpectedError("ops.curadoria", e);
  }
}
