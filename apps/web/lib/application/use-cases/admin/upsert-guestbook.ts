/**
 * Use Case: Upsert Guestbook
 *
 * Cria ou atualiza recado do casal (spec 019).
 */
import {
  type GuestbookError,
  validateGuestbookCreation,
  validateGuestbookDraft,
} from "@albora/core";
import {
  updateGuestbook,
  withEvent,
  GuestbookExistsError,
  insertGuestbook,
  eventGuestbook,
} from "@albora/db";
import type { Pool } from "pg";
import type { SerializedGuestbook } from "./get-admin-guestbook";
import { signGuestbookAudio } from "@/lib/infrastructure/api/handlers/guestbook-audio-url";

export type UpsertGuestbookInput = {
  eventId: string;
  texto: string;
  publicaEm: Date | null;
};

export type UpsertGuestbookResult =
  | {
      ok: true;
      recado: NonNullable<SerializedGuestbook>;
    }
  | {
      ok: false;
      erro: GuestbookError;
    };

async function serializar(recado: NonNullable<Awaited<ReturnType<typeof eventGuestbook>>>): Promise<NonNullable<SerializedGuestbook>> {
  return {
    id: recado.id,
    texto: recado.texto,
    publicaEm: recado.publicaEm?.toISOString() ?? null,
    audio: await signGuestbookAudio(recado.audio),
  };
}

export async function upsertGuestbook(
  input: UpsertGuestbookInput,
  pool: Pool,
): Promise<UpsertGuestbookResult> {
  const rascunho = { texto: input.texto, audio: null, publicaEm: input.publicaEm };

  try {
    const salvo = await withEvent(pool, input.eventId, async (c) => {
      const existente = await eventGuestbook(c, input.eventId);

      if (existente === null) {
        const erro = validateGuestbookCreation([], input.eventId, rascunho);
        if (erro) return { ok: false as const, erro };
        const recado = await insertGuestbook(c, {
          eventoId: input.eventId,
          texto: rascunho.texto.trim(),
          publicaEm: input.publicaEm,
        });
        return { ok: true as const, recado };
      }

      const erro = validateGuestbookDraft(rascunho);
      if (erro) return { ok: false as const, erro };
      const recado = await updateGuestbook(c, {
        eventoId: input.eventId,
        texto: rascunho.texto.trim(),
        publicaEm: input.publicaEm,
      });
      return { ok: true as const, recado: recado ?? existente };
    });

    if (!salvo.ok) return { ok: false, erro: salvo.erro };

    console.log("admin.recado_salvo", { eventId: input.eventId });
    return { ok: true, recado: await serializar(salvo.recado) };
  } catch (e) {
    if (e instanceof GuestbookExistsError) {
      return {
        ok: false,
        erro: {
          code: "recado.ja_existe" as const,
          details: { eventoId: input.eventId },
        },
      };
    }
    throw e;
  }
}
