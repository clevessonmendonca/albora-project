import React from "react";
import { notFound, redirect } from "next/navigation";
import { getAccount, getLatestImpersonationRequestForRequesterAndAccount } from "@albora/application";
import { hasCapability } from "@albora/core";
import { resolveActor } from "@/lib/console/actor";
import { getAggregatorPool, getPool } from "@/lib/db";
import { ROTULO_STATUS, ROTULO_TIPO, TOM_STATUS } from "@/features/console/components/client/accounts-table";
import { RevealPiiButton } from "@/features/console/components/client/reveal-pii-button";
import { DeleteAccountDanger } from "@/features/console/components/client/delete-account-danger";
import { ImpersonationRequestDrawer } from "@/features/console/components/client/impersonation-request-drawer";
import { ContaCabecalho, PainelDeDetalheConta } from "@/features/console/components/server/contas-cabecalho";

export const dynamic = "force-dynamic";

function formatarData(data: Date): string {
  return new Date(data).toLocaleDateString("pt-BR");
}

function formatarDataHora(data: Date): string {
  return new Date(data).toLocaleString("pt-BR");
}

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const { id } = await params;
  const conta = await getAccount(
    { pool: getPool(), aggregatorPool: getAggregatorPool() },
    { actor, reason: `abrir /console/accounts/${id}`, accountId: id },
  );
  // Conta inexistente é 404 honesto — nunca uma tela de três painéis vazios
  // fingindo que a conta existe e simplesmente não tem dado.
  if (!conta) notFound();

  const podeRevelar = hasCapability(actor.roles, "accounts.pii.reveal");
  const podeImpersonar = hasCapability(actor.roles, "impersonate.request");
  const podeExcluir = hasCapability(actor.roles, "lgpd.delete_account");

  // Pedido mais recente DESTE operador para ESTA conta — o Drawer usa pra
  // decidir entre formulário, "aguardando aprovação", "iniciar sessão" ou
  // "expirado". Só busca quando a capacidade existe: sem `impersonate.request`
  // não há Drawer nenhum pra alimentar.
  const pedidoDeImpersonacao = podeImpersonar
    ? await getLatestImpersonationRequestForRequesterAndAccount(getPool(), actor.staffUserId, id)
    : null;

  // `undefined` quando nenhuma capacidade se aplica, o elemento isolado
  // quando só uma se aplica — nunca um fragmento por padrão, que o
  // `ContaCabecalho` trataria como truthy mesmo vazio (ADR 0016 §5.5: quem
  // não tem a capacidade não recebe `actions`, o componente não decide
  // permissão). Array + filter em vez de ternário aninhado: com três
  // capacidades independentes, o ternário de 2 vira 8 ramos — o array
  // generaliza sem repetir combinação.
  const itensDeAcao = [
    podeRevelar ? <RevealPiiButton key="reveal" accountId={id} /> : null,
    podeImpersonar ? (
      <ImpersonationRequestDrawer
        key="impersonate"
        accountId={id}
        existingRequest={
          pedidoDeImpersonacao
            ? { id: pedidoDeImpersonacao.id, status: pedidoDeImpersonacao.status, expiresAt: pedidoDeImpersonacao.expiresAt }
            : null
        }
      />
    ) : null,
    podeExcluir ? <DeleteAccountDanger key="delete" accountId={id} maskedEmail={conta.maskedEmail} /> : null,
  ].filter((el): el is React.ReactElement => el !== null);

  const acoes = itensDeAcao.length === 0 ? undefined : itensDeAcao.length === 1 ? itensDeAcao[0] : <>{itensDeAcao}</>;

  return (
    <>
      <ContaCabecalho
        inicial={conta.type === "vendor" ? "F" : "A"}
        title={conta.maskedEmail}
        subtitle={ROTULO_TIPO[conta.type]}
        id={conta.id}
        status={{ tone: TOM_STATUS[conta.status], label: ROTULO_STATUS[conta.status] }}
        actions={acoes}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <PainelDeDetalheConta
          titulo="Identidade"
          secoes={[
            { key: "contato", label: "Contato", content: <p className="m-0">{conta.maskedEmail}</p>, emptyLabel: "—" },
            {
              key: "criada",
              label: "Criada em",
              content: <p className="m-0">{formatarData(conta.createdAt)}</p>,
              emptyLabel: "—",
            },
            {
              key: "login",
              // "Último login", nunca "último acesso" — a fonte
              // (host_sessions.created_at) marca emissão de sessão, não a
              // última ação da conta (regra dura da task).
              label: "Último login",
              content: conta.lastAccessAt.value ? (
                <div className="flex flex-col gap-1">
                  <p className="m-0">≈ {formatarData(conta.lastAccessAt.value)}</p>
                  <span className="tipo-caption text-ink-3">{conta.lastAccessAt.approximationBasis}</span>
                </div>
              ) : null,
              emptyLabel: "Sem sessão registrada",
            },
            {
              key: "consentimentos",
              label: "Consentimentos",
              content:
                conta.consentsByVersion.length > 0 ? (
                  <ul className="m-0 list-none p-0">
                    {conta.consentsByVersion.map((c) => (
                      <li key={c.versao}>
                        {c.versao}: {c.aceites} aceite(s)
                      </li>
                    ))}
                  </ul>
                ) : null,
              emptyLabel: "Nenhum consentimento registrado",
            },
          ]}
        />
        <PainelDeDetalheConta
          titulo="Atividade"
          secoes={[
            {
              key: "eventos",
              label: "Eventos",
              content:
                conta.events.length > 0 ? (
                  <ul className="m-0 list-none p-0">
                    {conta.events.map((e) => (
                      <li key={e.id}>
                        {e.title ?? e.id} — {formatarData(e.startsAt)} ({e.status})
                      </li>
                    ))}
                  </ul>
                ) : null,
              emptyLabel: "Nenhum evento ainda",
            },
            { key: "plano", label: "Plano", content: conta.plan ? <p className="m-0">{conta.plan}</p> : null, emptyLabel: "—" },
          ]}
        />
        <PainelDeDetalheConta
          titulo="Trilha"
          secoes={[
            {
              key: "audit",
              label: "Últimas ações da equipe nesta conta",
              content:
                conta.auditTrail.length > 0 ? (
                  <ul className="m-0 list-none p-0">
                    {conta.auditTrail.map((entrada) => (
                      <li key={entrada.id} className="flex flex-col gap-0.5">
                        <span>{entrada.action}</span>
                        <span className="tipo-caption text-ink-3">
                          {formatarDataHora(entrada.at)} — {entrada.actorLabel ?? entrada.actorId ?? "sistema"} —{" "}
                          {entrada.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null,
              emptyLabel: "Nenhuma ação da equipe registrada ainda",
            },
          ]}
        />
      </div>
    </>
  );
}
