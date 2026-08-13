import type { MidiaDoAlbum } from "@albora/core";
import type { PoolClient } from "pg";
import { thumbKeyFromFull } from "./storage-key";

/**
 * O que o álbum da noite lê (spec 016).
 *
 * 🔴 A mesma fonte de verdade do feed e da parede: `state = 'published'`. O
 * álbum é derivado — não guarda uma segunda regra de visibilidade, porque duas
 * divergem e a que sobra é a errada. A foto que o botão de pânico tira sai
 * daqui pela mesma coluna, no mesmo instante.
 *
 * O álbum é montado por `montarAlbum()` do `@albora/core` sobre estas linhas.
 * O núcleo pede `capturadaEm`, `largura` e `altura` que ainda não existem no
 * schema: `taken_at` chega quando o `confirm` o preservar antes de descartar o
 * EXIF (spec 016, risco registrado), e as dimensões idem. Até lá a leitura os
 * entrega como ausência declarada — `capturadaEm` nulo cai no `created_at` pela
 * regra do próprio núcleo, e a proporção assume retrato, que é a forma de três
 * em cada quatro fotos de festa. Nenhuma migration aqui: a leitura é derivada.
 */

const PUBLICADO = "published";

/** Teto da varredura. O álbum lê a noite inteira; o núcleo é quem poda páginas. */
export const TETO_DO_ALBUM = 2000;

/**
 * Proporção assumida enquanto `width`/`height` não são persistidos. Retrato,
 * porque encaixar a foto de festa em qualquer outra forma corta o topo — a
 * mesma regra vermelha que o telão e o layout do álbum impõem.
 */
export const LARGURA_PADRAO = 1080;
export const ALTURA_PADRAO = 1920;

export type MidiaDoAlbumComChave = MidiaDoAlbum & {
  chaveFull: string;
  chaveThumb: string;
};

export type JanelaDoAlbum = { comecaEm: Date; terminaEm: Date };

type Linha = {
  id: string;
  storage_key: string;
  session_id: string;
  challenge_id: string | null;
  place: string | null;
  created_at: Date;
  reacoes: number;
};

/**
 * As fotos públicas do evento, para o álbum, de dentro de uma transação já
 * escopada por `comEvento`.
 *
 * O `event_id` no WHERE é redundante sob RLS e vai mesmo assim: duas camadas
 * para a mesma invariante, como no resto do pacote. Só leitura — nenhuma
 * escrita passa por aqui.
 */
export async function listarMidiaDoAlbum(
  cliente: PoolClient,
  eventoId: string,
  limite: number = TETO_DO_ALBUM,
): Promise<MidiaDoAlbumComChave[]> {
  const teto = Math.min(Math.max(Math.trunc(limite), 1), TETO_DO_ALBUM);

  const { rows } = await cliente.query<Linha>(
    `SELECT u.id, u.storage_key, u.session_id, u.challenge_id, u.place, u.created_at,
            (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes
       FROM uploads u
      WHERE u.event_id = $1 AND u.state = $2
      ORDER BY u.created_at ASC, u.id ASC
      LIMIT $3`,
    [eventoId, PUBLICADO, teto],
  );

  return rows.map((l) => ({
    id: l.id,
    sessaoId: l.session_id,
    capturadaEm: null,
    recebidaEm: l.created_at,
    largura: LARGURA_PADRAO,
    altura: ALTURA_PADRAO,
    lugarId: l.place,
    missaoId: l.challenge_id,
    reacoes: l.reacoes,
    chaveFull: l.storage_key,
    chaveThumb: thumbKeyFromFull(l.storage_key),
  }));
}

/**
 * A janela do evento, que ancora as horas do álbum. Ausente quando o evento não
 * é visível — sob RLS, o mesmo que não existir; quem chama trata como álbum vazio.
 */
export async function janelaDoAlbum(
  cliente: PoolClient,
  eventoId: string,
): Promise<JanelaDoAlbum | null> {
  const { rows } = await cliente.query<{ starts_at: Date; ends_at: Date }>(
    "SELECT starts_at, ends_at FROM events WHERE id = $1",
    [eventoId],
  );

  const linha = rows[0];
  if (!linha) return null;

  return { comecaEm: linha.starts_at, terminaEm: linha.ends_at };
}
