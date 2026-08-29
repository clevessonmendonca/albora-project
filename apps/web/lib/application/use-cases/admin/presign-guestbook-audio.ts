/**
 * Use Case: Presign Guestbook Audio Upload
 *
 * Gera URL presignada para upload de áudio do guestbook.
 */
import { randomUUID } from "node:crypto";
import {
  deriveGuestbookAudioKey,
  durationForUpload,
  normalizeGuestbookAudioMime,
  VALIDADE_PRESIGN_SEGUNDOS,
  validateGuestbookAudioDeclaration,
  type TipoAudioRecado as GuestbookAudioMime,
} from "@albora/core";
import { assinarPut } from "@/lib/r2";

export type PresignGuestbookAudioInput = {
  eventId: string;
  accountId: string;
  mime: string;
  bytes: number;
  duracaoSegundos: number;
};

export type PresignGuestbookAudioResult =
  | {
      ok: true;
      chave: string;
      put: string;
      expiraEm: number;
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    };

export async function presignGuestbookAudioUpload(
  input: PresignGuestbookAudioInput,
): Promise<PresignGuestbookAudioResult> {
  const duracao = durationForUpload(input.duracaoSegundos);
  if (duracao === null) {
    return {
      ok: false,
      code: "recado.audio_vazio",
      message: "Áudio inválido",
    };
  }

  const mimeNormalizado = normalizeGuestbookAudioMime(input.mime);
  const invalido = validateGuestbookAudioDeclaration(
    mimeNormalizado ?? input.mime,
    input.bytes,
    duracao,
  );

  if (invalido) {
    switch (invalido.code) {
      case "recado.audio_tipo_recusado":
        return {
          ok: false,
          code: invalido.code,
          message: "Formato de áudio recusado",
          details: invalido.details,
        };
      case "recado.audio_grande_demais":
        return {
          ok: false,
          code: invalido.code,
          message: "Áudio grande demais",
          details: invalido.details,
        };
      default:
        return {
          ok: false,
          code: invalido.code,
          message: "Áudio inválido",
          details: "details" in invalido ? invalido.details : undefined,
        };
    }
  }

  if (!mimeNormalizado) {
    return {
      ok: false,
      code: "recado.audio_tipo_recusado",
      message: "Formato de áudio recusado",
      details: { recebido: input.mime },
    };
  }

  const chave = deriveGuestbookAudioKey(input.eventId, randomUUID());
  const put = await assinarPut(chave, mimeNormalizado as GuestbookAudioMime, VALIDADE_PRESIGN_SEGUNDOS);

  console.log("admin.recado_audio.presign", {
    accountId: input.accountId,
    eventId: input.eventId,
  });

  return {
    ok: true,
    chave,
    put: put.toString(),
    expiraEm: Date.now() + VALIDADE_PRESIGN_SEGUNDOS * 1000,
  };
}
