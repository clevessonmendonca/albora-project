"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  applySubscriptionCourtesy,
  assignTicket,
  cancelSubscription as cancelSubscriptionUseCase,
  changeSubscriptionPlan,
  CommandDeniedError,
  completeStaffLogin,
  completeStaffReauth,
  ReauthRequiredError,
  refundPayment,
  requestStaffLogin,
  requestStaffReauth,
  respondTicket,
  revealAccountPii,
  updateTicketPriority,
  updateTicketStatus,
} from "@albora/application";
import { findStaffById, type SupportPriority, type SupportStatus } from "@albora/db";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { resolveActor } from "@/lib/console/actor";
import { clearStaffSession, issueStaffSession, markStaffReauthenticated } from "@/lib/console/staff-session";
import { config } from "@/lib/config";
import { getBillingProvider } from "@/lib/billing";

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

  const staff = await findStaffById(getPool(), actor.staffUserId);
  if (!staff) redirect("/console/login");

  const jar = await headers();
  const origin = jar.get("origin") ?? "";
  const ipHash = await currentIpHash();

  await requestStaffReauth(getPool(), {
    staffUserId: staff.id,
    email: staff.email,
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

/** Traduz os erros do envelope de comando pra uma forma que o client component mostra sem re-lançar — mesma disciplina de `revealAccountPiiAction`. */
function traduzErroDeComando(erro: unknown): SimpleActionResult {
  if (erro instanceof CommandDeniedError) return { ok: false, error: erro.message };
  if (erro instanceof ReauthRequiredError) return { ok: false, error: "reautenticação exigida" };
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
