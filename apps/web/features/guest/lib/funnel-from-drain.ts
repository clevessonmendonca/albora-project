import {
  drain,
  MAX_ATTEMPTS,
  type DrainSummary,
  type EventoDoFunil,
  type Queue,
  type SendResult,
  type Transport,
} from "@albora/core";
import { reportFunnel } from "./report-funnel";

/**
 * O que o cliente anuncia depois de um dreno. `upload_start` e `upload_ok`
 * nascem no servidor; daqui só sai falha e a tentativa seguinte.
 *
 * `tentativasPorId` é o valor **antes** do dreno: depois do fail o item já
 * foi incrementado, e misturar os dois viraria retry na primeira queda.
 */
export function funnelEventsFromDrain(
  resultados: readonly SendResult[],
  tentativasPorId: ReadonlyMap<string, number>,
): EventoDoFunil[] {
  const eventos: EventoDoFunil[] = [];

  for (const r of resultados) {
    const tentativas = tentativasPorId.get(r.id) ?? 0;
    if (r.estado === "desistiu" && tentativas >= MAX_ATTEMPTS) continue;

    if (tentativas > 0) eventos.push("retry");
    if (r.estado === "retentar" || r.estado === "desistiu") eventos.push("upload_fail");
  }

  return eventos;
}

export async function drainAndReport(
  queue: Queue,
  transport: Transport,
  options: { online: () => boolean; limit?: number } = { online: () => true },
): Promise<DrainSummary> {
  const items = await queue.list();
  const tentativasPorId = new Map(items.map((i) => [i.id, i.tentativas]));
  const resumo = await drain(queue, transport, options);

  for (const name of funnelEventsFromDrain(resumo.resultados, tentativasPorId)) {
    reportFunnel(name);
  }

  return resumo;
}
