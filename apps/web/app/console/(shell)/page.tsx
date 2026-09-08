import React from "react";
import { redirect } from "next/navigation";
import { hasCapability, maiorPerdaComercial } from "@albora/core";
import { getConsoleAttention, getPlatformOverview, getPlatformRevenue, listLiveEvents } from "@albora/application";
import { MetricCard, PageHeader } from "@albora/ui-web";
import { diasDoPeriodo, PERIODOS, periodoValido } from "@/features/console/components/client/console-periodo";
import {
  EventosAoVivo,
  FilaDeAtencao,
  formatarNumero,
  FunilComercial,
  PainelH1,
} from "@/features/console/components/server/overview-sections";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

const LIMITE_AO_VIVO = 12;

function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

/**
 * `exactOptionalPropertyTypes` proíbe `anterior={undefined}` explícito — a
 * prop tem que estar ausente, não presente com valor `undefined`. Sem
 * baseline honesto (`v === null`), o spread não inclui a chave nenhuma.
 */
function propAnterior(v: number | null): { anterior: number } | Record<string, never> {
  return v === null ? {} : { anterior: v };
}

/**
 * Atenção primeiro, monitoramento depois (spec §4.2). A ordem é argumento:
 * o que exige decisão agora abre a tela; saúde e ao-vivo vêm abaixo, e
 * evento ao vivo nunca entra na fila de ação — é acompanhamento, não
 * pendência.
 */
export default async function ConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { periodo } = await searchParams;
  const valor = periodoValido(periodo);
  const days = diasDoPeriodo(valor);
  const rotuloJanela = PERIODOS.find((p) => p.valor === valor)!.rotulo.toLowerCase();

  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console — visão geral do dono";

  const [overview, revenue] = await Promise.all([
    getPlatformOverview(deps, { actor, reason, days }),
    getPlatformRevenue(deps, { actor, reason }),
  ]);

  const [pendencias, aoVivo] = await Promise.all([
    getConsoleAttention(deps, { actor, reason, overdueSubscriptions: revenue.overdueCount }),
    hasCapability(actor.roles, "events.read")
      ? listLiveEvents(deps, { actor, reason, limit: LIMITE_AO_VIVO })
      : Promise.resolve({ rows: [] }),
  ]);

  return (
    <>
      <PageHeader
        title="O que pede atenção agora."
        description={`Janela: ${rotuloJanela}. A fila reúne só o que cruzou prazo, risco ou impacto — o resto segue abaixo, para acompanhar.`}
      />

      <FilaDeAtencao itens={pendencias} />

      <h2 className="tipo-den-titulo mb-3">Saúde da plataforma</h2>

      <PainelH1 atual={overview.h1.current} serie={overview.h1Series} janela="30 dias" />

      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          rotulo="Receita recorrente"
          valor={formatarReais(revenue.mrrCents)}
          valorNumerico={revenue.mrrCents}
          bomQuando="sobe"
          janela="Assinaturas ativas de fornecedor"
        />
        <MetricCard
          rotulo="Churn de fornecedor ≈"
          valor={`≈ ${formatarNumero(revenue.churned30d.value)}`}
          valorNumerico={revenue.churned30d.value}
          bomQuando="desce"
          janela={revenue.churned30d.approximationBasis}
        />
        <MetricCard
          rotulo="Eventos ativos"
          valor={formatarNumero(overview.eventsActive.current)}
          valorNumerico={overview.eventsActive.current}
          {...propAnterior(overview.eventsActive.baseline)}
          bomQuando="sobe"
          janela={`Últimos ${rotuloJanela}`}
        />
        <MetricCard
          rotulo="Convidados alcançados"
          valor={formatarNumero(overview.guestsReached.current)}
          valorNumerico={overview.guestsReached.current}
          {...propAnterior(overview.guestsReached.baseline)}
          bomQuando="sobe"
          janela={`Últimos ${rotuloJanela}`}
        />
      </section>

      <FunilComercial degraus={overview.commercialFunnel} perda={maiorPerdaComercial(overview.commercialFunnel)} />

      <EventosAoVivo eventos={aoVivo.rows} />
    </>
  );
}
