/**
 * Use Case: Issue Magic Link
 *
 * Emite magic link de autenticação para o anfitrião.
 */
import {
  emitirMagicLink,
  recordProductEvent,
  VALIDADE_MAGIC_LINK_MINUTOS,
} from "@albora/db";
import type { Pool } from "pg";
import { sendHostEmail } from "@/lib/email";

export type IssueMagicLinkInput = {
  sessionSecret: string;
  email: string;
  next: string | null;
  requestOrigin: string;
  isDev: boolean;
};

export type IssueMagicLinkOutput = {
  enviado: boolean;
  link?: string;
};

export async function issueMagicLink(
  input: IssueMagicLinkInput,
  pool: Pool,
): Promise<IssueMagicLinkOutput> {
  const expiresAt = new Date(Date.now() + VALIDADE_MAGIC_LINK_MINUTOS * 60 * 1000);
  const result = await emitirMagicLink(pool, input.sessionSecret, input.email, expiresAt);
  const { token, isNewAccount } = result;

  if (isNewAccount) {
    void recordProductEvent(pool, "account_created");
  }

  const nextQ = input.next ? `&next=${encodeURIComponent(input.next)}` : "";
  const link = `${input.requestOrigin}/admin/sign-in?m=${token}${nextQ}`;

  void sendHostEmail({
    to: input.email,
    subject: "Seu link para entrar na Albora",
    text: [
      "Para entrar no painel, abra este link (válido por poucos minutos):",
      "",
      link,
      "",
      "Se você não pediu isso, ignore este e-mail.",
    ].join("\n"),
  });

  console.log("admin.magic_link_emitido", {});

  return input.isDev ? { enviado: true, link } : { enviado: true };
}
