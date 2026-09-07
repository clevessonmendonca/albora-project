/**
 * Use Case: Initiate Drive Connection
 *
 * Consome step-up e inicia OAuth flow com Google Drive.
 */
import { ACAO_DRIVE_CONNECT } from "@albora/core";
import { consumirStepUp, ErroMagicLinkInvalido, emitirEstadoOAuthDrive } from "@albora/db";
import type { Pool } from "pg";
import { DRIVE_AUTH_ENDPOINT, DRIVE_SCOPE } from "@/lib/drive";

export type InitiateDriveConnectionInput = {
  eventId: string;
  accountId: string;
  sessionSecret: string;
  confirmacao: string;
  oauthClientId: string;
  oauthStateSecret: string;
  requestOrigin: string;
};

export type InitiateDriveConnectionResult =
  | {
      ok: true;
      redirectUrl: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

function redirectUriDoCallback(origin: string, eventId: string): string {
  return `${origin}/api/admin/events/${eventId}/drive/callback`;
}

export async function initiateDriveConnection(
  input: InitiateDriveConnectionInput,
  pool: Pool,
): Promise<InitiateDriveConnectionResult> {
  try {
    await consumirStepUp(
      pool,
      input.sessionSecret,
      input.confirmacao,
      input.accountId,
      new Date(),
      ACAO_DRIVE_CONNECT,
    );
  } catch (e) {
    if (e instanceof ErroMagicLinkInvalido) {
      return {
        ok: false,
        code: "admin.reauth_invalida",
        message: "Confirmação inválida ou expirada",
      };
    }
    throw e;
  }

  const state = emitirEstadoOAuthDrive(input.oauthStateSecret, {
    eventId: input.eventId,
    accountId: input.accountId,
  });

  const url = new URL(DRIVE_AUTH_ENDPOINT);
  url.searchParams.set("client_id", input.oauthClientId);
  url.searchParams.set("scope", DRIVE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUriDoCallback(input.requestOrigin, input.eventId));

  console.log("drive_connect_start", { eventId: input.eventId });

  return { ok: true, redirectUrl: url.toString() };
}
