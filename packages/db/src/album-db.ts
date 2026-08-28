import type { MidiaDoAlbum } from "@albora/core";
import { fusoOuPadrao, offsetMinutosDoFuso } from "@albora/core";
import type { PoolClient } from "pg";
import { dimensoesDoAlbum } from "./dimensoes";
import { thumbKeyFromFull } from "./storage-key";

/** 🔴 Mesma fonte de verdade do feed: state = 'published'. Álbum derivado — uma segunda regra de visibilidade divergiria e a errada prevaleceria. */

const PUBLICADO = "published";

/** Teto da varredura. O álbum lê a noite inteira; o núcleo é quem poda páginas. */
export const TETO_DO_ALBUM = 2000;

/** Proporção padrão: retrato. Outra forma corta o topo — mesma regra vermelha do telão. */
export { LARGURA_PADRAO, ALTURA_PADRAO } from "./dimensoes";

export type MidiaDoAlbumComChave = MidiaDoAlbum & {
  chaveFull: string;
  chaveThumb: string;
  mime: string;
};

export type JanelaDoAlbum = {
  comecaEm: Date;
  terminaEm: Date;
  fuso: string;
  offsetMinutos: number;
};

type Linha = {
  id: string;
  storage_key: string;
  mime: string;
  session_id: string;
  challenge_id: string | null;
  place: string | null;
  created_at: Date;
  taken_at: Date | null;
  width: number | null;
  height: number | null;
  prompt_key: string | null;
  reacoes: number;
};

/** event_id no WHERE redundante sob RLS — duas camadas para a mesma invariante. */
export async function listarMidiaDoAlbum(
  cliente: PoolClient,
  eventoId: string,
  limite: number = TETO_DO_ALBUM,
): Promise<MidiaDoAlbumComChave[]> {
  const teto = Math.min(Math.max(Math.trunc(limite), 1), TETO_DO_ALBUM);

  const { rows } = await cliente.query<Linha>(
    `SELECT u.id, u.storage_key, u.mime, u.session_id, u.challenge_id, u.place, u.created_at,
            u.taken_at, u.width, u.height, u.prompt_key,
            (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes
       FROM uploads u
      WHERE u.event_id = $1 AND u.state = $2
      ORDER BY u.created_at ASC, u.id ASC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows.map((l) => {
    const { largura, altura } = dimensoesDoAlbum(l.width, l.height);
    return {
      id: l.id,
      sessaoId: l.session_id,
      capturadaEm: l.taken_at,
      recebidaEm: l.created_at,
      largura,
      altura,
      lugarId: l.place,
      missaoId: l.challenge_id,
      promptKey: l.prompt_key,
      reacoes: l.reacoes,
      chaveFull: l.storage_key,
      chaveThumb: thumbKeyFromFull(l.storage_key),
      mime: l.mime,
    };
  });
}

/** null quando o evento não é visível sob RLS — quem chama trata como álbum vazio. */
export async function janelaDoAlbum(
  cliente: PoolClient,
  eventoId: string,
): Promise<JanelaDoAlbum | null> {
  const { rows } = await cliente.query<{ starts_at: Date; ends_at: Date; timezone: string }>(
    "SELECT starts_at, ends_at, timezone FROM events WHERE id = $1",
    [eventoId],
  );

  const linha = rows[0];
  if (!linha) return null;

  const fuso = fusoOuPadrao(linha.timezone);
  return {
    comecaEm: linha.starts_at,
    terminaEm: linha.ends_at,
    fuso,
    offsetMinutos: offsetMinutosDoFuso(fuso, linha.starts_at),
  };
}
