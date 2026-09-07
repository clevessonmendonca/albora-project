/**
 * Use Case: Remove Cover Image
 *
 * Remove chave da imagem de capa do evento.
 */
import { atualizarChaveImagemCapa, withEvent } from "@albora/db";
import type { Pool } from "pg";

export type RemoveCoverImageInput = {
  eventId: string;
  accountId: string;
};

export async function removeCoverImage(
  input: RemoveCoverImageInput,
  pool: Pool,
): Promise<void> {
  await withEvent(pool, input.eventId, (c) =>
    atualizarChaveImagemCapa(c, input.eventId, null),
  );

  console.log("admin.cover_image.removido", {
    accountId: input.accountId,
    eventId: input.eventId,
  });
}
