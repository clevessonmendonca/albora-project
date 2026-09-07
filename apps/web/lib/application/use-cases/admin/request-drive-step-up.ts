/**
 * Use Case: Request Drive Step-Up
 *
 * Emite magic link de step-up para confirmar conexão com Google Drive.
 */
import { ACAO_DRIVE_CONNECT } from "@albora/core";
import { emitirStepUp } from "@albora/db";
import type { Pool } from "pg";
import { sendHostEmail } from "@/lib/email";

export const VALIDADE_STEP_UP_DRIVE_MINUTOS = 15;

export type RequestDriveStepUpInput = {
  eventId: string;
  accountId: string;
  hostEmail: string;
  sessionSecret: string;
  requestOrigin: string;
  isDev: boolean;
};

export type RequestDriveStepUpResult = {
  enviado: boolean;
  link?: string;
};

export async function requestDriveStepUp(
  input: RequestDriveStepUpInput,
  pool: Pool,
): Promise<RequestDriveStepUpResult> {
  const expiresAt = new Date(Date.now() + VALIDADE_STEP_UP_DRIVE_MINUTOS * 60 * 1000);
  const { token } = await emitirStepUp(
    pool,
    input.sessionSecret,
    input.accountId,
    expiresAt,
    ACAO_DRIVE_CONNECT,
  );
  const link = `${input.requestOrigin}/admin/e/${input.eventId}/album?driveConectar=${token}`;

  void sendHostEmail({
    to: input.hostEmail,
    subject: "Confirme a conexão com o Google Drive",
    text: [
      "Alguém pediu para conectar este evento ao Google Drive do casal.",
      "Se foi você, abra o link abaixo. Ele vale por 15 minutos e só funciona uma vez.",
      "",
      link,
      "",
      "Se não foi você, ignore este e-mail. Sem a confirmação a conexão não começa.",
    ].join("\n"),
  });

  console.log("admin.drive.reauth", { accountId: input.accountId });

  return input.isDev ? { enviado: true, link } : { enviado: true };
}
