/**
 * Use Case: Confirm Guestbook Audio Upload
 *
 * Confirma upload e valida conteúdo do áudio do guestbook.
 */
import {
  durationForUpload,
  isGuestbookAudioKey,
  normalizeGuestbookAudioMime,
  validateGuestbookAudioConsent,
  validateGuestbookAudioContent,
  validateGuestbookAudioDeclaration,
} from "@albora/core";
import { eventGuestbook, updateGuestbookAudio, withEvent } from "@albora/db";
import type { Pool } from "pg";
import { inspecionarObjeto } from "@/lib/r2";
import { signGuestbookAudio } from "@/lib/infrastructure/api/handlers/guestbook-audio-url";

export type ConfirmGuestbookAudioInput = {
  eventId: string;
  accountId: string;
  chave: string;
  mime: string;
  duracaoSegundos: number;
  aceite: boolean;
};

export type ConfirmGuestbookAudioResult =
  | {
      ok: true;
      recado: {
        id: string;
        audio: Awaited<ReturnType<typeof signGuestbookAudio>>;
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
      details?: Record<string, unknown> | undefined;
    };

export async function confirmGuestbookAudioUpload(
  input: ConfirmGuestbookAudioInput,
  pool: Pool,
): Promise<ConfirmGuestbookAudioResult> {
  const aceiteErro = validateGuestbookAudioConsent(input.aceite);
  if (aceiteErro) {
    return {
      ok: false,
      code: aceiteErro.code,
      message: "Confirme que a gravação é da sua voz",
    };
  }

  if (!isGuestbookAudioKey(input.eventId, input.chave)) {
    return {
      ok: false,
      code: "recado.chave_do_cliente",
      message: "A chave de storage não vem do cliente",
    };
  }

  const mimeNormalizado = normalizeGuestbookAudioMime(input.mime);
  if (!mimeNormalizado) {
    return {
      ok: false,
      code: "recado.audio_tipo_recusado",
      message: "Formato de áudio recusado",
      details: { recebido: input.mime },
    };
  }

  const duracao = durationForUpload(input.duracaoSegundos);
  if (duracao === null) {
    return {
      ok: false,
      code: "recado.audio_vazio",
      message: "Áudio inválido",
    };
  }

  const objeto = await inspecionarObjeto(input.chave);
  if (!objeto) {
    return {
      ok: false,
      code: "recado.audio_ausente",
      message: "O arquivo ainda não chegou",
    };
  }

  const tamanho = validateGuestbookAudioDeclaration(mimeNormalizado, objeto.bytes, duracao);
  if (tamanho) {
    switch (tamanho.code) {
      case "recado.audio_grande_demais":
        return {
          ok: false,
          code: tamanho.code,
          message: "Áudio grande demais",
          details: tamanho.details,
        };
      default:
        return {
          ok: false,
          code: tamanho.code,
          message: "Áudio inválido",
          details: "details" in tamanho ? tamanho.details : undefined,
        };
    }
  }

  const conteudo = validateGuestbookAudioContent(mimeNormalizado, objeto.inicio);
  if (conteudo) {
    console.warn("admin.recado_audio.conteudo_recusado", { eventId: input.eventId });
    return {
      ok: false,
      code: conteudo.code,
      message: "Arquivo recusado",
      details: "details" in conteudo ? conteudo.details : undefined,
    };
  }

  const recado = await withEvent(pool, input.eventId, async (c) => {
    const existente = await eventGuestbook(c, input.eventId);
    if (!existente) return null;
    return updateGuestbookAudio(c, {
      eventoId: input.eventId,
      audio: { chave: input.chave, duracaoSegundos: duracao },
    });
  });

  if (!recado) {
    return {
      ok: false,
      code: "recado.inexistente",
      message: "Salve o texto do recado primeiro",
    };
  }

  console.log("admin.recado_audio.confirmado", {
    accountId: input.accountId,
    eventId: input.eventId,
  });

  return {
    ok: true,
    recado: {
      id: recado.id,
      audio: await signGuestbookAudio(recado.audio),
    },
  };
}
