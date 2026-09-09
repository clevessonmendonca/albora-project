import React from "react";
import { redirect } from "next/navigation";
import { hasCapability, maiorPerdaComercial } from "@albora/core";
import { getConsoleAttention, getPlatformOverview, getPlatformRevenue, listLiveEvents } from "@albora/application";
import { diasDoPeriodo, PERIODOS, periodoValido } from "@/features/console/components/client/console-periodo";
import {
  CabecalhoDaVisaoGeral,
  EventosAoVivo,
  FaixaDeMetricas,
  FilaDeAtencao,
  formatarNumero,
  FunilComercial,
  PainelH1,
} from "@/features/console/components/server/overview-sections";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * O teto era 8 enquanto `listEventsAdmin` buscava as métricas numa consulta
 * por linha; agora a página inteira sai numa agregação em lote e o custo não
 * cresce com a linha. Doze é o que a faixa mostra sem rolar — e quando satura,
 * o rótulo diz que está mostrando os primeiros em vez de afirmar o total.
 */
const LIMITE_AO_VIVO = 12;

function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

/** Sem baseline honesto não há comparação a mostrar — nem seta, nem 0%. */
function variacao(atual: number, anterior: number | null): string | undefined {
  if (anterior === null || anterior === 0) return undefined;
  const delta = Math.round(((atual - anterior) / anterior) * 100);
  return `${delta >= 0 ? "+" : ""}${delta}% vs. período anterior`;
}

function nota(valor: string | undefined): { nota: string } | Record<string, never> {
  return valor === undefined ? {} : { nota: valor };
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

  const criticas = pendencias.filter((p) => p.severidade === "critico").length;

  return (
    <>
      <CabecalhoDaVisaoGeral
        janela={valor === "hoje" ? "Hoje" : `Nos últimos ${rotuloJanela}`}
        pendencias={pendencias.length}
        criticas={criticas}
      />

      <FilaDeAtencao itens={pendencias} />

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(18rem,22rem)_1fr]">
        <PainelH1 atual={overview.h1.current} serie={overview.h1Series} />

        <div className="flex flex-col gap-4">
          <FaixaDeMetricas
            metricas={[
              {
                rotulo: "Receita recorrente",
                valor: formatarReais(revenue.mrrCents),
                nota: `${formatarNumero(revenue.activeSubscriptions)} assinatura(s) ativa(s)`,
              },
              {
                rotulo: "Churn estimado",
                valor: `≈ ${formatarNumero(revenue.churned30d.value)}`,
                nota: revenue.churned30d.approximationBasis,
              },
              {
                rotulo: "Eventos ativos",
                valor: formatarNumero(overview.eventsActive.current),
                ...nota(variacao(overview.eventsActive.current, overview.eventsActive.baseline)),
              },
              {
                rotulo: "Convidados no período",
                valor: formatarNumero(overview.guestsReached.current),
                ...nota(variacao(overview.guestsReached.current, overview.guestsReached.baseline)),
              },
            ]}
          />

          <FunilComercial
            degraus={overview.commercialFunnel}
            perda={maiorPerdaComercial(overview.commercialFunnel)}
          />
        </div>
      </div>

      <EventosAoVivo eventos={aoVivo.rows} teto={LIMITE_AO_VIVO} />
    </>
  );
}
