import type { PoolClient } from "pg";
import { thumbKeyFromFull } from "./storage-key";

export type ModoGaleria = "espelho" | "completo";

export type MidiaMinha = {
  id: string;
  chaveFull: string;
  chaveThumb: string;
  mime: string;
  criadaEm: Date;
  legenda: string | null;
  lugar: string | null;
  autor: string;
  /** Só depois do gate — mesma regra do feed. */
  reacoes?: number;
  minhaReacao?: string | null;
};

/**
 * Fotos confirmadas desta sessão no evento (spec 008).
 *
 * Inclui o que a moderação escondeu do feed alheio: a galeria pessoal responde
 * "chegou?", não "está público?". Só some o que a própria sessão removeu.
 */
export async function listarMinhasDoEvento(
  cliente: PoolClient,
  sessaoId: string,
  modo: ModoGaleria = "espelho",
): Promise<MidiaMinha[]> {
  const contagem =
    modo === "completo"
      ? ", (SELECT count(*) FROM reactions r WHERE r.upload_id = u.id)::int AS reacoes"
      : "";
  const minha =
    modo === "completo"
      ? ", (SELECT r.kind FROM reactions r WHERE r.upload_id = u.id AND r.session_id = $1) AS minha_reacao"
      : "";

  const { rows } = await cliente.query<{
    id: string;
    storage_key: string;
    mime: string;
    created_at: Date;
    caption: string | null;
    place: string | null;
    display_name: string;
    reacoes?: number;
    minha_reacao?: string | null;
  }>(
    `SELECT u.id, u.storage_key, u.mime, u.created_at, u.caption, u.place,
            s.display_name${contagem}${minha}
       FROM uploads u
       JOIN guest_sessions s ON s.id = u.session_id AND s.event_id = u.event_id
      WHERE u.session_id = $1 AND u.state <> 'removed'
      ORDER BY u.created_at DESC`,
    [sessaoId],
  );

  return rows.map((l) => {
    const item: MidiaMinha = {
      id: l.id,
      chaveFull: l.storage_key,
      chaveThumb: thumbKeyFromFull(l.storage_key),
      mime: l.mime,
      criadaEm: l.created_at,
      legenda: l.caption,
      lugar: l.place,
      autor: l.display_name,
    };

    if (modo === "completo") {
      item.reacoes = l.reacoes ?? 0;
      item.minhaReacao = l.minha_reacao ?? null;
    }

    return item;
  });
}
