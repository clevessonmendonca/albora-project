"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  CommandDeniedError,
  completeStaffLogin,
  completeStaffReauth,
  ReauthRequiredError,
  requestStaffLogin,
  requestStaffReauth,
  revealAccountPii,
} from "@albora/application";
import { findStaffById } from "@albora/db";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { resolveActor } from "@/lib/console/actor";
import { clearStaffSession, issueStaffSession, markStaffReauthenticated } from "@/lib/console/staff-session";
import { config } from "@/lib/config";

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
