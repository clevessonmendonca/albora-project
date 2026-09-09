"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  applySubscriptionCourtesy,
  approveImpersonation,
  ApprovalRequiredError,
  assignTicket,
  cancelSubscription as cancelSubscriptionUseCase,
  changeSubscriptionPlan,
  CommandDeniedError,
  completeStaffLogin,
  completeStaffReauth,
  createDsarRequest,
  deleteAccountOnRequest,
  denyImpersonation,
  endImpersonation,
  markAccountPurgeResult,
  ReauthRequiredError,
  refundPayment,
  requestImpersonation,
  requestStaffLogin,
  requestStaffReauth,
  respondTicket,
  revealAccountPii,
  searchConsole,
  startImpersonation,
  updateDsarRequest,
  updateTicketPriority,
  updateTicketStatus,
  type ConsoleSearchResult,
} from "@albora/application";
import type { DsarKind, DsarStatus, SupportPriority, SupportStatus } from "@albora/db";
import { getAggregatorPool, getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { resolveActor } from "@/lib/console/actor";
import { clearStaffSession, issueStaffSession, markStaffReauthenticated } from "@/lib/console/staff-session";
import { config } from "@/lib/config";
import { getBillingProvider } from "@albora/integrations";
import { driveConfig } from "@/lib/drive-config";
import { getDriveClient, getDriveVault } from "@/lib/drive";
import { deleteObject } from "@/lib/r2";

/**
 * HMAC, nunca sha256 puro: o espaço IPv4 tem 2^32 entradas, então hash sem
 * segredo é reversível por força bruta em segundos — seria ofuscação, não
 * pseudonimização. Esse valor vai para audit_log e security_events sob LGPD.
 */
function ipHashFromHeaders(raw: string | null): string {
  const { sessionSecret } = config();
  return createHmac("sha256", sessionSecret).update(raw ?? "sem-ip").digest("hex");
}

async function currentIpHash(): Promise<string> {
  const jar = await headers();
  const ip = jar.get("cf-connecting-ip") ?? jar.get("x-forwarded-for");
  return ipHashFromHeaders(ip);
}

export async function requestLoginAction(email: string): Promise<{ sent: boolean }> {
  const jar = await headers();
  const origin = jar.get("origin") ?? "";
  const ipHash = await currentIpHash();

  await requestStaffLogin(getPool(), {
    email,
    ipHash,
    sendEmail: async ({ to, token }: { to: string; token: string }) => {
      void sendHostEmail({
        to,
        subject: "Seu link para entrar no console",
        text: [
          "Para entrar no console, abra este link (válido por poucos minutos):",
          "",
          `${origin}/console/login?m=${token}`,
          "",
          "Se você não pediu isso, ignore este e-mail.",
        ].join("\n"),
      });
    },
  });

  return { sent: true };
}

export async function completeLoginAction(token: string): Promise<{ ok: boolean }> {
  const ipHash = await currentIpHash();
  const result = await completeStaffLogin(getPool(), { token, ipHash });
  if (!result.ok) return { ok: false };

  await issueStaffSession(result.staffUserId);
  return { ok: true };
}

export async function signOutAction(): Promise<void> {
  await clearStaffSession();
  redirect("/console/login");
}

/**
 * Step-up de reautenticação: quem chama já está logado (`resolveActor`) —
 * diferente de `requestLoginAction`, que atende visitante anônimo. Sem
 * actor válido, redireciona pro login em vez de silenciosamente não fazer
 * nada, porque não há e-mail de destino sem um staff resolvido.
 */
export async function requestReauthAction(): Promise<{ sent: boolean }> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  const jar = await headers();
  const origin = jar.get("origin") ?? "";
  const ipHash = await currentIpHash();

  await requestStaffReauth(getPool(), {
    staffUserId: actor.staffUserId,
    ipHash,
    sendEmail: async ({ to, token }: { to: string; token: string }) => {
      void sendHostEmail({
        to,
        subject: "Confirme que é você — ação sensível no console",
        text: [
          "Uma ação sensível no console pede reautenticação recente:",
          "",
          `${origin}/console/reauth?m=${token}`,
          "",
          "Se você não pediu isso, ignore este e-mail.",
        ].join("\n"),
      });
    },
  });

  return { sent: true };
}

/**
 * Diferente de `completeLoginAction`: aqui NÃO se emite sessão nova — a
 * sessão já existe. `completeStaffReauth` já garante que o link pertence ao
 * `staffUserId` do actor atual (a checagem de posse fica na camada de
 * aplicação, testável sem cookie). Se passar, `markStaffReauthenticated`
 * carimba a sessão que o cookie desta requisição já resolve — mesma sessão,
 * sem rotação.
 */
export async function completeReauthAction(token: string): Promise<{ ok: boolean }> {
  const actor = await resolveActor();
  if (!actor) return { ok: false };

  const ipHash = await currentIpHash();
  const result = await completeStaffReauth(getPool(), { token, ipHash, staffUserId: actor.staffUserId });
  if (!result.ok) return { ok: false };

  await markStaffReauthenticated();
  return { ok: true };
}

export type RevealAccountPiiActionResult = { ok: true; email: string } | { ok: false; error: string };

/**
 * Primeira mutação da Onda C ponta a ponta por `executeCommand` — a
 * autorização e a auditoria acontecem dentro de `revealAccountPii`, nunca
 * aqui. Este server action só resolve o ator e traduz os erros do envelope
 * para uma forma que o client component consegue mostrar sem re-lançar.
 */
export async function revealAccountPiiAction(
  accountId: string,
  reason: string,
): Promise<RevealAccountPiiActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  try {
    const resultado = await revealAccountPii({ pool: getPool() }, { actor, reason, accountId });
    return { ok: true, email: resultado.email };
  } catch (erro) {
    if (erro instanceof CommandDeniedError) return { ok: false, error: erro.message };
    if (erro instanceof ReauthRequiredError) return { ok: false, error: "reautenticação exigida" };
    throw erro;
  }
}

export type SimpleActionResult = { ok: true } | { ok: false; error: string };

/**
 * Traduz os erros do envelope de comando pra uma forma que o client component
 * mostra sem re-lançar — mesma disciplina de `revealAccountPiiAction`.
 *
 * `ApprovalRequiredError` (hoje só `subscription.refund`, ver `refundPolicy`
 * em `packages/core/src/authorization/policies.ts`) devolve a mensagem
 * default da classe, que carrega `approverCapability` — é o componente que
 * decide como mostrar isso ao operador, não esta camada.
 */
function traduzErroDeComando(erro: unknown): SimpleActionResult {
  if (erro instanceof CommandDeniedError) return { ok: false, error: erro.message };
  if (erro instanceof ReauthRequiredError) return { ok: false, error: "reautenticação exigida" };
  if (erro instanceof ApprovalRequiredError) return { ok: false, error: erro.message };
  throw erro;
}

/**
 * Ações da mesa de suporte (T5): cada uma chama um dos quatro comandos da
 * T4 por `executeCommand`, que já grava sua própria auditoria com um motivo
 * derivado da própria ação (ver comentário de `respondTicket`) — não existe
 * um "motivo" livre digitado pelo operador para atribuir, mudar status ou
 * prioridade; o registro substantivo é a própria mudança.
 *
 * `revalidatePath` depois de cada sucesso: os `<Select>` de status/
 * prioridade/responsável são controlados pelo `ticket` que a página server
 * carregou, não por estado local — sem isso, o React devolveria o select à
 * opção antiga no re-render seguinte à troca (o valor "voltaria sozinho"),
 * porque a prop `ticket` nunca teria mudado.
 */
export async function respondTicketAction(ticketId: string, body: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await respondTicket({ pool: getPool() }, { actor, ticketId, body });
    revalidatePath("/console/support");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function assignTicketAction(ticketId: string, assigneeStaffId: string | null): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await assignTicket({ pool: getPool() }, { actor, ticketId, assigneeStaffId });
    revalidatePath("/console/support");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function updateTicketStatusAction(ticketId: string, status: SupportStatus): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await updateTicketStatus({ pool: getPool() }, { actor, ticketId, status });
    revalidatePath("/console/support");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function updateTicketPriorityAction(ticketId: string, priority: SupportPriority): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await updateTicketPriority({ pool: getPool() }, { actor, ticketId, priority });
    revalidatePath("/console/support");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

/**
 * Mutações de assinatura (T6): cada ação chama seu comando por
 * `executeCommand`, nunca escreve `vendor_subscriptions`/`billing_payments`
 * direto — o webhook do Asaas (`billing_webhook_events`, idempotente)
 * continua sendo a fonte da verdade sobre o estado local. `getBillingProvider()`
 * é o `BillingProvider` real (Asaas) ou o stub de dev — a única instância
 * criada aqui, na borda; `packages/application` só conhece o shape por
 * `SubscriptionBillingPort`.
 */
export async function changeSubscriptionPlanAction(
  subscriptionId: string,
  newPlan: "starter" | "studio" | "agency",
  amountCents: number,
  reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await changeSubscriptionPlan(
      { pool: getPool(), billing: getBillingProvider() },
      { actor, reason, subscriptionId, newPlan, amountCents },
    );
    revalidatePath("/console/subscriptions");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function applySubscriptionCourtesyAction(
  subscriptionId: string,
  discountPercent: number,
  reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await applySubscriptionCourtesy(
      { pool: getPool(), billing: getBillingProvider() },
      { actor, reason, subscriptionId, discountPercent },
    );
    revalidatePath("/console/subscriptions");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function cancelSubscriptionAction(subscriptionId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await cancelSubscriptionUseCase(
      { pool: getPool(), billing: getBillingProvider() },
      { actor, reason, subscriptionId },
    );
    revalidatePath("/console/subscriptions");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function refundPaymentAction(
  paymentId: string,
  asaasPaymentId: string,
  amountCents: number,
  reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await refundPayment(
      { pool: getPool(), billing: getBillingProvider() },
      { actor, reason, paymentId, asaasPaymentId, amountCents },
    );
    revalidatePath("/console/subscriptions");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

/**
 * DSAR (T7): diferente da mesa de suporte, o motivo aqui é sempre digitado
 * pelo operador — `executeCommand` (`createDsarRequest`/`updateDsarRequest`)
 * não deriva um `reason` automático, porque um pedido de titular sob LGPD
 * pede a justificativa por extenso na trilha, não "criou/atualizou pedido".
 */
export async function createDsarRequestAction(
  kind: DsarKind,
  subjectAccountId: string,
  legalDueAt: string,
  reason: string,
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await createDsarRequest({ pool: getPool() }, { actor, reason, kind, subjectAccountId, legalDueAt: new Date(legalDueAt) });
    revalidatePath("/console/lgpd");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function updateDsarRequestAction(
  id: string,
  reason: string,
  patch: { status?: DsarStatus; evidenceUrl?: string | null; notes?: string | null },
): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await updateDsarRequest({ pool: getPool() }, { actor, reason, id, ...patch });
    revalidatePath("/console/lgpd");
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export type DeleteAccountActionResult = { ok: true } | { ok: false; error: string; reauthRequired?: true };

/** Vault do Drive opcional — mesma checagem de `processRetentionJobs`: sem segredos OAuth configurados, a revogação simplesmente não acontece; o purge de banco e de bytes no R2 continua normalmente. */
function vaultSeConfigurado() {
  try {
    driveConfig();
    return getDriveVault();
  } catch {
    return undefined;
  }
}

/**
 * Exclusão de conta a pedido do titular (T8): só roda como execução de um
 * pedido DSAR `kind = "deletion"` já aberto — `dsarRequestId` identifica
 * qual. Quem abre esse pedido é `createDsarRequestAction`, a partir da tela
 * de Conta; esta action nunca é chamada por lá, só pela tela LGPD.
 *
 * `deleteAccountOnRequest` já fez o fail-closed inteiro dentro de uma única
 * transação — se chegou até aqui sem lançar, a conta e os eventos já não
 * existem mais no banco, o pedido DSAR já está `completed`, e cada key de
 * `keysToDelete` já está gravada em `account_purge_jobs` como `pending`
 * (migration 0066) — durável mesmo que o purge abaixo nunca rode.
 *
 * Bytes no R2 e revogação do refresh token do Drive são enriquecimento
 * pós-commit, no MESMO desenho do runner de retenção
 * (`processRetentionJobs`): uma falha aqui não desfaz nem esconde que a
 * conta foi excluída. Diferente do que era antes, a falha não fica só num
 * console.warn — a linha da fila vira `failed` com `last_error`, visível em
 * `listPendingAccountPurgeJobs` para ops encontrar o byte órfão depois.
 * `purgeJobIds` está na mesma ordem de `keysToDelete` (garantia de
 * `enqueueAccountPurge`), por isso o zip por índice abaixo é seguro.
 */
export async function deleteAccountAction(
  accountId: string,
  dsarRequestId: string,
  reason: string,
): Promise<DeleteAccountActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");

  try {
    const vault = vaultSeConfigurado();
    const resultado = await deleteAccountOnRequest(
      { pool: getPool(), ...(vault ? { vault } : {}) },
      { actor, reason, accountId, dsarRequestId },
    );

    for (let i = 0; i < resultado.keysToDelete.length; i++) {
      const key = resultado.keysToDelete[i]!;
      const jobId = resultado.purgeJobIds[i];
      try {
        await deleteObject(key);
        if (jobId) await markAccountPurgeResult(getPool(), jobId, { ok: true });
      } catch (e) {
        console.warn("lgpd.delete_account.purge_r2_falhou", { accountId, erro: String(e) });
        if (jobId) await markAccountPurgeResult(getPool(), jobId, { ok: false, error: String(e) });
      }
    }
    for (const token of resultado.driveRefreshTokensToRevoke) {
      try {
        await getDriveClient().revoke(token);
      } catch (e) {
        console.warn("lgpd.delete_account.revoke_drive_falhou", { accountId, erro: String(e) });
      }
    }

    revalidatePath("/console/lgpd");
    return { ok: true };
  } catch (erro) {
    if (erro instanceof ReauthRequiredError) return { ok: false, error: "reautenticação exigida", reauthRequired: true };
    if (erro instanceof CommandDeniedError) return { ok: false, error: erro.message };
    throw erro;
  }
}

/**
 * Impersonação (T9/T10): cada ação chama seu comando por `executeCommand`
 * (única exceção documentada é a própria criação do pedido — ver comentário
 * de `requestImpersonation`, que não passa por `executeCommand` porque
 * `impersonate.request` tem política incondicional `needsApproval`; o
 * pedido pendente replica a garantia do envelope manualmente). O motivo é
 * sempre digitado pelo operador em `requestImpersonationAction` e
 * `approveImpersonationAction`/`denyImpersonationAction` — decisão sobre a
 * conta de outra pessoa pede justificativa por extenso, igual DSAR.
 *
 * `startImpersonationAction`/`endImpersonationAction` não pedem motivo
 * novo ao operador: iniciar é continuação do pedido já aprovado (motivo já
 * registrado na aprovação) e encerrar é sempre a mesma ação substantiva —
 * mesma disciplina de `respondTicketAction` (T5), que também deriva o
 * motivo em vez de pedir um livre.
 */
export async function requestImpersonationAction(accountId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await requestImpersonation({ pool: getPool() }, { actor, reason, targetAccountId: accountId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function approveImpersonationAction(requestId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await approveImpersonation({ pool: getPool() }, { actor, reason, requestId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function denyImpersonationAction(requestId: string, reason: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await denyImpersonation({ pool: getPool() }, { actor, reason, requestId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

/** Só quem pediu pode iniciar a própria janela aprovada — `startImpersonation` (T9) já garante isso dentro do comando. */
export async function startImpersonationAction(requestId: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await startImpersonation(
      { pool: getPool(), sessionSecret: config().sessionSecret },
      { actor, reason: "início de sessão aprovada", requestId },
    );
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

export async function endImpersonationAction(requestId: string): Promise<SimpleActionResult> {
  const actor = await resolveActor();
  if (!actor) redirect("/console/login");
  try {
    await endImpersonation({ pool: getPool() }, { actor, reason: "encerrado pelo operador", requestId });
    return { ok: true };
  } catch (erro) {
    return traduzErroDeComando(erro);
  }
}

/** ⌘K (T4/Onda D). Falha vira lista vazia, nunca trava a paleta aberta em "Buscando…". */
export async function searchConsoleAction(query: string): Promise<ConsoleSearchResult[]> {
  const actor = await resolveActor();
  if (!actor) return [];
  try {
    return await searchConsole(
      { pool: getPool(), aggregatorPool: getAggregatorPool() },
      { actor, reason: "console.search", query },
    );
  } catch {
    return [];
  }
}
