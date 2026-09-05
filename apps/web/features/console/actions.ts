"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { completeStaffLogin, requestStaffLogin } from "@albora/application";
import { getPool } from "@/lib/db";
import { sendHostEmail } from "@/lib/email";
import { issueStaffSession } from "@/lib/console/staff-session";
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
