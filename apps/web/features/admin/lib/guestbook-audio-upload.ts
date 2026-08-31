import { ACEITE_AUDIO_VERSAO } from "@albora/core";
import type { PendingGuestbookAudio, SavedGuestbookAudio } from "./guestbook-audio";

type PresignResposta = { chave: string; put: string };

export async function uploadGuestbookAudio(
  eventId: string,
  pending: PendingGuestbookAudio,
): Promise<SavedGuestbookAudio> {
  const presignRes = await fetch(`/api/admin/events/${eventId}/guestbook/audio`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      mime: pending.mime,
      bytes: pending.blob.size,
      duracaoSegundos: pending.duracaoSegundos,
    }),
  });
  const presignBody = (await presignRes.json()) as PresignResposta & { message?: string };
  if (!presignRes.ok) throw new Error(presignBody.message ?? "falhou");

  const put = await fetch(presignBody.put, {
    method: "PUT",
    headers: { "content-type": pending.mime },
    body: pending.blob,
  });
  if (!put.ok) throw new Error("O áudio não chegou ao armazenamento.");

  const confirmRes = await fetch(`/api/admin/events/${eventId}/guestbook/audio/confirm`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chave: presignBody.chave,
      mime: pending.mime,
      duracaoSegundos: pending.duracaoSegundos,
      aceite: ACEITE_AUDIO_VERSAO,
    }),
  });
  const confirmBody = (await confirmRes.json()) as {
    recado?: { audio?: SavedGuestbookAudio | null };
    message?: string;
  };
  if (!confirmRes.ok) throw new Error(confirmBody.message ?? "falhou");
  const audio = confirmBody.recado?.audio;
  if (!audio) throw new Error("O áudio não ficou disponível.");
  return audio;
}

export async function deleteGuestbookAudio(eventId: string): Promise<void> {
  const r = await fetch(`/api/admin/events/${eventId}/guestbook/audio`, { method: "DELETE" });
  if (!r.ok) {
    const body = (await r.json()) as { message?: string };
    throw new Error(body.message ?? "falhou");
  }
}
