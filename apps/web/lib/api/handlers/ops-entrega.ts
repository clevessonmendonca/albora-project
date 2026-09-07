import { listarEventosComEntregaDevida } from "@albora/db";
import { runDeliveryForEvent } from "@albora/application";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { config } from "@/lib/config";
import { getAggregatorPool, getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function autorizado(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return process.env.APP_ENV === "dev";
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Runner diário de entrega (ADR 0019): listagem cross-evento via
 * `getAggregatorPool()` (BYPASSRLS, só `event_id` — mesmo papel de
 * `listDueRetentionJobs`/`listEventsWithPendingModeration`); o envio em si
 * roda por evento via `runDeliveryForEvent`, que já tem lock advisory por
 * evento e idempotência própria (`delivered_at`). Cron automático e disparo
 * manual do admin (`postDisparo`) são dois consumidores do mesmo runner —
 * o lock evita envio em dobro se coincidirem. Um evento que lança não aborta
 * o sweep dos outros, igual ao sweep de retenção e ao de moderação.
 */
export async function postOpsEntrega(req: Request) {
  if (!autorizado(req)) {
    return errorResponse(401, "job.nao_autorizado", "Não autorizado");
  }

  try {
    const eventos = await listarEventosComEntregaDevida(getAggregatorPool());
    const baseUrl = new URL(req.url).origin;

    let enviados = 0;
    let pendentes = 0;

    for (const eventoId of eventos) {
      try {
        const resultado = await runDeliveryForEvent(
          {
            pool: getPool(),
            segredo: config().sessionSecret,
            baseUrl,
            sendEmail: sendHostEmail,
          },
          eventoId,
        );
        enviados += resultado.enviados;
        pendentes += resultado.pendentes;
      } catch (e) {
        console.error("entrega.job_falhou", { eventId: eventoId, erro: String(e) });
      }
    }

    console.log("entrega.sweep", { eventos: eventos.length, enviados, pendentes });
    return jsonOk({ eventos: eventos.length, enviados, pendentes });
  } catch (e) {
    return unexpectedError("ops.entrega", e);
  }
}
