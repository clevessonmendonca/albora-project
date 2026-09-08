import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { listDsarRequests, type DsarKind, type DsarRequestRow } from "@albora/application";
import { hasCapability } from "@albora/core";
import { ConsoleEmptyState, DataTable, StatusBadge, type DataTableColumn, type StatusBadgeTone } from "@albora/ui-web";
import { resolveActor } from "@/lib/console/actor";
import { getPool } from "@/lib/db";
import { DsarForm } from "@/features/console/components/client/dsar-form";
import { DsarRequestActions } from "@/features/console/components/client/dsar-request-actions";
import { FaixaDeMetricas, formatarNumero } from "@/features/console/components/server/overview-sections";
import { Painel, TituloDaTela } from "@/features/console/components/server/console-primitivos";

export const dynamic = "force-dynamic";

const ROTULO_KIND: Record<DsarKind, string> = {
  access: "Acesso",
  portability: "Portabilidade",
  rectification: "Retificação",
  deletion: "Exclusão",
};

const ROTULO_STATUS: Record<DsarRequestRow["status"], string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  completed: "Concluído",
  refused: "Recusado",
};

const TOM_STATUS: Record<DsarRequestRow["status"], StatusBadgeTone> = {
  open: "neutral",
  in_progress: "atencao",
  completed: "positive",
  refused: "critico",
};

function formatarData(d: Date): string {
  return new Date(d).toLocaleDateString("pt-BR");
}

function diasRestantes(legalDueAt: Date, agora: Date): number {
  return Math.ceil((new Date(legalDueAt).getTime() - agora.getTime()) / 86_400_000);
}

/** Vermelho só na cor seria invisível a quem não distingue cores — o texto sempre carrega o número de dias, atrasado ou não. */
function PrazoCell({ row, agora }: { row: DsarRequestRow; agora: Date }) {
  const dias = diasRestantes(row.legalDueAt, agora);
  const atrasado = dias < 0;
  return (
    <span className={atrasado ? "text-critico" : "text-ink"}>
      {formatarData(row.legalDueAt)} — {atrasado ? `${Math.abs(dias)}d em atraso` : `${dias}d restantes`}
    </span>
  );
}

/**
 * Rastreador de DSAR (T7) — prazo legal é input de quem registra, nunca
 * calculado (RULING: nenhuma fonte no produto define dias por tipo de
 * pedido). Fila ordenada pelo servidor por prazo mais próximo primeiro,
 * mesma lógica da mesa de suporte por SLA: o que queima primeiro fica no
 * topo. Fecha a órfã de navegação — "LGPD" já existia na sidebar sem rota;
 * agora linka explicitamente para `/console/retention` (Onda B), hoje
 * inatingível por qualquer outro caminho.
 *
 * Zero PII de titular na tabela: `subjectAccountId` vira link para
 * `/console/accounts/{id}`, onde a revelação mascarada já existe (T3,
 * `RevealPiiButton`) — esta tela nunca desmascara por conta própria.
 */
export default async function LgpdPage() {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { rows } = await listDsarRequests(
    { pool: getPool() },
    { actor, statuses: ["open", "in_progress"], limit: 100 },
  );
  const agora = new Date();
  const podeGerenciar = hasCapability(actor.roles, "lgpd.dsar.execute");
  const vencidos = rows.filter((r) => diasRestantes(r.legalDueAt, agora) < 0).length;

  const columns: DataTableColumn<DsarRequestRow>[] = [
    { key: "kind", header: "Tipo", render: (r) => ROTULO_KIND[r.kind] },
    {
      key: "subjectAccountId",
      header: "Titular",
      render: (r) => (
        <a href={`/console/accounts/${r.subjectAccountId}`} className="tipo-den-corpo text-ink underline decoration-ink-3/40 underline-offset-2">
          Ver conta →
        </a>
      ),
    },
    { key: "receivedAt", header: "Recebido", render: (r) => formatarData(r.receivedAt) },
    { key: "legalDueAt", header: "Prazo legal", render: (r) => <PrazoCell row={r} agora={agora} /> },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge tone={TOM_STATUS[r.status]}>{ROTULO_STATUS[r.status]}</StatusBadge>,
    },
    ...(podeGerenciar
      ? [
          {
            key: "acoes",
            header: "Ações",
            render: (r: DsarRequestRow) => <DsarRequestActions row={r} />,
          } satisfies DataTableColumn<DsarRequestRow>,
        ]
      : []),
  ];

  return (
    <>
      <TituloDaTela
        titulo="LGPD · pedidos do titular (DSAR)"
        descricao="Pedidos de titular com prazo legal — precisa provar que foi cumprido, não lembrar que foi."
        acoes={
          <Link href="/console/retention" className="tipo-den-corpo text-acento-texto no-underline">
            Ver retenção →
          </Link>
        }
      />

      {rows.length > 0 && (
        <FaixaDeMetricas
          metricas={[
            { rotulo: "Abertos", valor: formatarNumero(rows.length) },
            { rotulo: "Vencidos", valor: formatarNumero(vencidos), ...(vencidos > 0 ? { nota: "prazo legal" } : {}) },
            { rotulo: "No prazo", valor: formatarNumero(rows.length - vencidos) },
          ]}
        />
      )}

      {podeGerenciar && <DsarForm />}

      {rows.length === 0 ? (
        <Painel>
          <ConsoleEmptyState
            title="Nenhum pedido aberto"
            description="Pedidos de acesso, portabilidade, retificação ou exclusão aparecem aqui, com o prazo mais próximo do vencimento no topo."
          />
        </Painel>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.id}
          pageSize={Math.max(rows.length, 1)}
          pageSizeOptions={[Math.max(rows.length, 1)]}
          itemLabel="pedidos"
          emptyMessage="Nenhum pedido."
        />
      )}
    </>
  );
}
