/**
 * Use Case: Delete Guestbook Audio
 *
 * Remove áudio do guestbook.
 */
import { updateGuestbookAudio, withEvent } from "@albora/db";
import type { Pool } from "pg";

export type DeleteGuestbookAudioInput = {
  eventId: string;
  accountId: string;
};

export type DeleteGuestbookAudioResult =
  | {
      ok: true;
      recado: {
        id: string;
        audio: null;
      };
    }
  | {
      ok: false;
      code: string;
      message: string;
    };

export async function deleteGuestbookAudio(
  input: DeleteGuestbookAudioInput,
  pool: Pool,
): Promise<DeleteGuestbookAudioResult> {
  const recado = await withEvent(pool, input.eventId, (c) =>
    updateGuestbookAudio(c, { eventoId: input.eventId, audio: null }),
  );

  if (!recado) {
    return {
      ok: false,
      code: "recado.inexistente",
      message: "Salve o texto do recado primeiro",
    };
  }

  console.log("admin.recado_audio.apagado", {
    accountId: input.accountId,
    eventId: input.eventId,
  });

  return {
    ok: true,
    recado: { id: recado.id, audio: null },
  };
}
