import React from "react";
import { redirect } from "next/navigation";
import { maiorPerda } from "@albora/core";
import { getPlatformOverview, getPlatformRevenue } from "@albora/application";
import { BarChart, ConsoleEmptyState, MetricCard, PageHeader, Sparkline, StatusBadge } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

function formatarPercentual(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

function formatarNumero(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

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
 * Tela que o dono abre para saber se o negócio existe. Ordem é argumento,
 * não estética (spec de design §8.1.1): H1 sozinha e em destaque primeiro,
 * depois volume, depois o funil que responde "por que a H1 caiu", por
 * último o que precisa de ação.
 */
export default async function ConsolePage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const deps = { pool: getPool(), aggregatorPool: getAggregatorPool() };
  const reason = "abrir /console — visão geral do dono";

  const [overview, revenue] = await Promise.all([
    getPlatformOverview(deps, { actor, reason, days: 30 }),
    getPlatformRevenue(deps, { actor, reason }),
  ]);

  // Perda absoluta, não relativa (packages/core/src/funnel.ts) — é o degrau
  // que ganha o destaque `--critico`, porque é onde mexer primeiro.
  const perdaCritica = maiorPerda(overview.funnel);

  // Único sinal de "saúde operacional" que T2 entregou sem exigir dado
  // inventado: assinatura de fornecedor em atraso. Retenção/export de mídia
  // do convidado não tem query nesta onda — a coluna abaixo assume isso e
  // mostra estado vazio honesto em vez de fabricar contagem.
  const falhasDeCobranca =
    revenue.overdueCount > 0
      ? [
          {
            id: "assinaturas-atraso",
            descricao: `${formatarNumero(revenue.overdueCount)} assinatura(s) de fornecedor em atraso`,
          },
        ]
      : [];

  return (
    <>
      <PageHeader title="Visão geral" description="Saúde do negócio nos últimos 30 dias." />

      {/* 1. H1 — sozinha, largura total: é a métrica que decide se o negócio existe. */}
      <section className="mb-8 flex flex-col gap-4 rounded-2xl border border-linha bg-superficie p-6">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="flex flex-col gap-1">
            <span className="tipo-den-rotulo text-ink-3">H1 — participação</span>
            <span className="tipo-den-metrica text-[2.5rem] leading-none text-ink">
              {formatarPercentual(overview.h1.current)}
            </span>
          </div>
          <Sparkline
            label="H1 — participação nos últimos 30 dias"
            points={overview.h1Series.map((ponto) => ({ label: ponto.date, value: ponto.rate ?? 0 }))}
            width={220}
            height={56}
          />
        </div>
        <p className="tipo-den-corpo m-0 max-w-2xl text-ink-3">
          % de convidados presentes que enviaram ao menos uma foto — a hipótese que decide se o negócio existe.
        </p>
        <MetricCard
          rotulo="H1 vs. período anterior"
          valor={formatarPercentual(overview.h1.current)}
          valorNumerico={overview.h1.current === null ? 0 : Math.round(overview.h1.current * 100)}
          {...propAnterior(overview.h1.baseline === null ? null : Math.round(overview.h1.baseline * 100))}
          bomQuando="sobe"
          janela="Últimos 30 dias"
        />
      </section>

      {/* 2. Faixa de volume. */}
      <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          rotulo="Eventos ativos"
          valor={formatarNumero(overview.eventsActive.current)}
          valorNumerico={overview.eventsActive.current}
          {...propAnterior(overview.eventsActive.baseline)}
          bomQuando="sobe"
          janela="Últimos 30 dias"
        />
        <MetricCard
          rotulo="Convidados alcançados"
          valor={formatarNumero(overview.guestsReached.current)}
          valorNumerico={overview.guestsReached.current}
          {...propAnterior(overview.guestsReached.baseline)}
          bomQuando="sobe"
          janela="Últimos 30 dias"
        />
        <MetricCard
          rotulo="MRR"
          valor={formatarReais(revenue.mrrCents)}
          valorNumerico={revenue.mrrCents}
          bomQuando="sobe"
          janela="Assinaturas ativas de fornecedor"
        />
        <MetricCard
          rotulo="Tickets abertos"
          valor={formatarNumero(overview.openTickets)}
          valorNumerico={overview.openTickets}
          bomQuando="desce"
          janela="Agora"
        />
      </section>

      {/* 3. Funil de ativação — responde por que a H1 caiu; o degrau de maior perda ganha destaque crítico. */}
      <section className="mb-8">
        <h2 className="tipo-den-titulo mb-3">Funil de ativação</h2>
        {overview.funnel.length === 0 ? (
          <ConsoleEmptyState
            title="Sem sessões na janela"
            description="Nenhuma sessão de convidado nos últimos 30 dias para montar o funil."
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            {overview.funnel.map((degrau) => {
              const critico = perdaCritica?.de === degrau.etapa;
              return (
                <div
                  key={degrau.etapa}
                  className="flex min-w-[9rem] flex-1 flex-col gap-1 rounded-2xl border border-linha bg-superficie p-4"
                  style={critico ? { borderColor: "var(--critico)" } : undefined}
                >
                  <span className="tipo-den-rotulo text-ink-3">{degrau.etapa}</span>
                  <span className="tipo-den-metrica text-ink">{formatarNumero(degrau.sessoes)}</span>
                  <span className="tipo-den-corpo text-ink-3">
                    {degrau.retencao === null ? "—" : `${Math.round(degrau.retencao * 100)}% do anterior`}
                  </span>
                  {critico && perdaCritica ? (
                    <StatusBadge tone="critico">onde mais perde: {formatarNumero(perdaCritica.sessoesPerdidas)}</StatusBadge>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 4. Duas colunas: eventos recentes | saúde operacional. Falha é clicável — job falhado é trabalho, não informação. */}
      <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="tipo-den-titulo m-0">Eventos recentes</h2>
          <ConsoleEmptyState
            title="Sem fonte de dados nesta versão"
            description="Esta tela ainda não tem uma consulta de eventos recentes — nenhum dado foi inventado para preencher o espaço."
          />
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="tipo-den-titulo m-0">Saúde operacional</h2>
          {falhasDeCobranca.length === 0 ? (
            <ConsoleEmptyState
              title="Sem falha de cobrança agora"
              description="Nenhuma assinatura de fornecedor em atraso nesta janela."
            />
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {falhasDeCobranca.map((falha) => (
                <li key={falha.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-2xl border border-critico bg-superficie p-3 text-left"
                  >
                    <span className="tipo-den-corpo text-ink">{falha.descricao}</span>
                    <StatusBadge tone="critico">precisa de ação</StatusBadge>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-2xl border border-linha bg-superficie p-4">
            <span className="tipo-den-rotulo text-ink-3">Churn de fornecedor (30d)</span>
            <div className="tipo-den-metrica text-ink">≈ {formatarNumero(revenue.churned30d.value)}</div>
            <span className="tipo-den-corpo text-ink-3">aproximado: {revenue.churned30d.approximationBasis}</span>
          </div>
        </div>
      </section>

      {/* Canal B2B2C — mesma janela de receita, fornecedores por plano. */}
      <section>
        <h2 className="tipo-den-titulo mb-3">Canal B2B2C — fornecedores por plano</h2>
        {revenue.vendorsByPlan.length === 0 ? (
          <ConsoleEmptyState title="Sem fornecedor cadastrado" description="Nenhum fornecedor nesta plataforma ainda." />
        ) : (
          <BarChart
            label="Fornecedores por plano"
            points={revenue.vendorsByPlan.map((v) => ({ label: v.plan, value: v.count }))}
          />
        )}
      </section>
    </>
  );
}
