import type { Pool } from "pg";
import { consumeGuestMagicLink, emitGuestMagicLinkRow, isGuestSessionLive } from "@albora/db";
import { claimGuestPhotosByEmail } from "./claim-guest-photos-by-email";

/** Validade do magic link do convidado. Curta: é prova de posse de e-mail, não sessão. */
export const VALIDADE_GUEST_MAGIC_LINK_MINUTOS = 15;

export type EmitGuestMagicLinkDeps = {
  pool: Pool;
  segredo: string;
  baseUrl: string;
  sendEmail: (mensagem: { to: string; subject: string; text: string }) => Promise<{ enviado: boolean }>;
};

export type EmitGuestMagicLinkInput = {
  eventId: string;
  guestSessionId: string;
  email: string;
};

/**
 * BLINDADO (ADR 0018, Decisão 2): revalida a `guest_session` no servidor
 * antes de gravar qualquer coisa — sessão morta ou de outro evento é um
 * no-op silencioso, `{enviado:false}`, nada escrito em `guest_magic_links`.
 * Nunca cria conta de anfitrião nem sessão de anfitrião.
 */
export async function emitGuestMagicLink(
  deps: EmitGuestMagicLinkDeps,
  input: EmitGuestMagicLinkInput,
): Promise<{ enviado: boolean }> {
  const vivo = await isGuestSessionLive(deps.pool, input.eventId, input.guestSessionId);
  if (!vivo) return { enviado: false };

  const email = input.email.trim().toLowerCase();
  const expiraEm = new Date(Date.now() + VALIDADE_GUEST_MAGIC_LINK_MINUTOS * 60 * 1000);

  const { token } = await emitGuestMagicLinkRow(deps.pool, deps.segredo, input.eventId, input.guestSessionId, email, expiraEm);

  const link = `${deps.baseUrl}/auth/guest-magic/callback?token=${token}`;

  return deps.sendEmail({
    to: email,
    subject: "Acesse suas fotos",
    text: `Clique no link para acessar suas fotos: ${link}`,
  });
}

/**
 * Consome o token (single-use, atômico) e, só se válido, reivindica as
 * fotos da sessão para o e-mail via `claimGuestPhotosByEmail` — mesmo
 * caminho e mesma blindagem do claim via Google (ADR 0018, Decisão 2):
 * nunca cria conta de anfitrião, nunca sessão de anfitrião, nunca cruza evento.
 */
export async function verifyGuestMagicLink(pool: Pool, segredo: string, token: string): Promise<{ eventId: string } | null> {
  const resolvido = await consumeGuestMagicLink(pool, segredo, token);
  if (!resolvido) return null;

  await claimGuestPhotosByEmail(pool, {
    eventId: resolvido.eventId,
    guestSessionId: resolvido.sessionId,
    email: resolvido.email,
    verifiedVia: "magic_link",
  });

  return { eventId: resolvido.eventId };
}
