/**
 * Use Case: Request Export Step-Up
 *
 * Emite magic link de step-up para confirmar download de export.
 */
import { withEvent, emitirStepUp, planoDoEvento, VALIDADE_STEP_UP_MINUTOS } from "@albora/db";
import { podeBaixarZip } from "@albora/core";
import type { Pool } from "pg";
import { sendHostEmail } from "@/lib/email";

export type RequestExportStepUpInput = {
  eventId: string;
  accountId: string;
  hostEmail: string;
  sessionSecret: string;
  requestOrigin: string;
  isDev: boolean;
};

export type RequestExportStepUpResult =
  | {
      ok: true;
      enviado: boolean;
      link?: string;
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function requestExportStepUp(
  input: RequestExportStepUpInput,
  pool: Pool,
): Promise<RequestExportStepUpResult> {
  const plan = await withEvent(pool, input.eventId, (c) => planoDoEvento(c, input.eventId));
  
  if (!podeBaixarZip(plan)) {
    return {
      ok: false,
      code: "plano.zip",
      message: "O download em ZIP entra no plano Completo. Subir de plano não interrompe os convidados.",
    };
  }

  const expiresAt = new Date(Date.now() + VALIDADE_STEP_UP_MINUTOS * 60 * 1000);
  const { token } = await emitirStepUp(pool, input.sessionSecret, input.accountId, expiresAt);
  const link = `${input.requestOrigin}/admin/e/${input.eventId}/album?exportar=${token}`;

  void sendHostEmail({
    to: input.hostEmail,
    subject: "Confirme o download do álbum",
    text: [
      "Alguém pediu para baixar todas as fotos deste evento.",
      "Se foi você, abra o link abaixo. Ele vale por 15 minutos e só funciona uma vez.",
      "",
      link,
      "",
      "Se não foi você, ignore este e-mail. Sem a confirmação o download não começa.",
    ].join("\n"),
  });

  console.log("admin.export.reauth", { accountId: input.accountId });

  return input.isDev ? { ok: true, enviado: true, link } : { ok: true, enviado: true };
}
