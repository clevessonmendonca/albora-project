/**
 * Use Case: Get Admin Guestbook
 *
 * Carrega recado do casal para o admin.
 */
import { withEvent, eventGuestbook } from "@albora/db";
import type { GuestbookEntry } from "@albora/core";
import type { Pool } from "pg";
import { signGuestbookAudio } from "@/lib/infrastructure/api/handlers/guestbook-audio-url";

export type GetAdminGuestbookInput = {
  eventId: string;
};

export type SerializedGuestbook = {
  id: string;
  texto: string;
  publicaEm: string | null;
  audio: Awaited<ReturnType<typeof signGuestbookAudio>>;
} | null;

export type GetAdminGuestbookOutput = {
  recado: SerializedGuestbook;
};

async function serializar(recado: GuestbookEntry | null): Promise<SerializedGuestbook> {
  if (!recado) return null;
  return {
    id: recado.id,
    texto: recado.texto,
    publicaEm: recado.publicaEm?.toISOString() ?? null,
    audio: await signGuestbookAudio(recado.audio),
  };
}

export async function getAdminGuestbook(
  input: GetAdminGuestbookInput,
  pool: Pool,
): Promise<GetAdminGuestbookOutput> {
  const recado = await withEvent(pool, input.eventId, (c) =>
    eventGuestbook(c, input.eventId),
  );

  return { recado: await serializar(recado) };
}
