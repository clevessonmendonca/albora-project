/**
 * Use Case: Set Event Music
 * 
 * Define música do casal a partir de um link.
 */

import { parseMusicLink } from "@albora/core";
import { withEvent, definirMusicaDoCasal, musicaDoCasal } from "@albora/db";
import type { Pool } from "pg";
import { metadadoParaFaixaDoCasal } from "@/lib/music-track";

export type SetEventMusicInput = {
  eventId: string;
  accountId: string;
  url: string;
};

export type SetEventMusicResult =
  | {
      ok: true;
      musica: Awaited<ReturnType<typeof musicaDoCasal>>;
      provedor: string;
    }
  | { ok: false; code: string; message: string; details?: Record<string, unknown> };

/**
 * Define música do casal.
 * 
 * Spec 018: título e artista são enriquecimento — falha → grava o link e UI cai para URL crua.
 * 
 * @param input - eventId, accountId e URL da música
 * @param pool - Pool de conexões
 * @returns Música definida ou erro de validação
 */
export async function setEventMusic(
  input: SetEventMusicInput,
  pool: Pool,
): Promise<SetEventMusicResult> {
  const lido = parseMusicLink(input.url.trim());
  if (!lido.ok) {
    return {
      ok: false,
      code: lido.erro.code,
      message: "Link não aceito",
      details: lido.erro.details,
    };
  }

  const metadado = await metadadoParaFaixaDoCasal(lido.link);

  await withEvent(pool, input.eventId, (c) =>
    definirMusicaDoCasal(c, {
      eventoId: input.eventId,
      link: lido.link,
      metadado,
    }),
  );

  const musica = await withEvent(pool, input.eventId, (c) =>
    musicaDoCasal(c, input.eventId),
  );

  console.log("admin.musica_definida", {
    accountId: input.accountId,
    eventId: input.eventId,
    provedor: lido.link.provedor,
  });

  return {
    ok: true,
    musica,
    provedor: lido.link.provedor,
  };
}
