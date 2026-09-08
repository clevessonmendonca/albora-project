import type { Pool } from "pg";
import { funilComercial, taxaDeParticipacaoOuNula, type Actor, type DegrauComercial, type DegrauDoFunil } from "@albora/core";
import {
  collectPlatformLiveMetrics,
  platformFunnelInWindow,
  platformParticipationDailySeries,
  platformParticipationInWindow,
  platformVolumeInWindow,
  type PlatformParticipationDay,
} from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";
import type { MetricWithBaseline } from "./types";

export type PlatformOverviewInput = { actor: Actor; reason: string; days: number };

export type PlatformOverview = {
  /** `current` também é `T | null`: sem evento na janela, não há taxa nenhuma pra mostrar (não é "0%"). */
  h1: MetricWithBaseline<number | null>;
  h1Series: PlatformParticipationDay[];
  eventsActive: MetricWithBaseline<number>;
  guestsReached: MetricWithBaseline<number>;
  photos: MetricWithBaseline<number>;
  openTickets: number;
  /**
   * Funil de **uso** do convidado (QR→foto), agregado na plataforma. Contexto
   * do evento, não do negócio: a Visão geral mostra `commercialFunnel`, este
   * pertence ao detalhe do Evento (spec §4.2).
   */
  funnel: DegrauDoFunil[];
  /** Funil **comercial** (aquisição→conversão), derivado de `product_events`. */
  commercialFunnel: DegrauComercial[];
};

/** Único caso de uso da Visão geral: H1 (com sparkline), funil de ativação e volume, todos por janela ao vivo (nota de reconhecimento 1 — `analytics_snapshots` não guarda série histórica). */
export async function getPlatformOverview(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: PlatformOverviewInput,
): Promise<PlatformOverview> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "analytics.platform.read",
    reason: input.reason,
    action: "analytics.platform_overview.read",
    run: async (client) => {
      const now = new Date();
      const inicioAtual = new Date(now.getTime() - input.days * 86_400_000);
      const inicioAnterior = new Date(inicioAtual.getTime() - input.days * 86_400_000);

      const [atual, anterior, serie, funil, volumeAtual, volumeAnterior, live] = await Promise.all([
        platformParticipationInWindow(deps.aggregatorPool, { from: inicioAtual, to: now }),
        platformParticipationInWindow(deps.aggregatorPool, { from: inicioAnterior, to: inicioAtual }),
        platformParticipationDailySeries(deps.aggregatorPool, 30),
        platformFunnelInWindow(deps.aggregatorPool, { from: inicioAtual, to: now }),
        platformVolumeInWindow(deps.aggregatorPool, { from: inicioAtual, to: now }),
        platformVolumeInWindow(deps.aggregatorPool, { from: inicioAnterior, to: inicioAtual }),
        collectPlatformLiveMetrics(deps.aggregatorPool, input.days),
      ]);
      // As funções de `@albora/db` aceitam `Pool` (o teste do pacote db as
      // chama assim, direto), não `PoolClient` — a transação que `client`
      // representa aqui é só o que garante que a auditoria de
      // `withPlatformAggregation` já foi gravada antes desta leitura rodar.
      void client;

      return {
        h1: {
          current: taxaDeParticipacaoOuNula(atual),
          baseline: taxaDeParticipacaoOuNula(anterior),
        },
        h1Series: serie,
        eventsActive: { current: volumeAtual.eventsCreated, baseline: volumeAnterior.eventsCreated },
        guestsReached: { current: volumeAtual.guestsReached, baseline: volumeAnterior.guestsReached },
        photos: { current: volumeAtual.photos, baseline: volumeAnterior.photos },
        openTickets: live.openTickets,
        funnel: funil,
        commercialFunnel: funilComercial(live.productEventsByName),
      };
    },
  });
}
