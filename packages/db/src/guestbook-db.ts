import type { LeituraDoRecado, Recado } from "@albora/core";
import type { PoolClient } from "pg";

type LinhaRecado = {
  id: string;
  event_id: string;
  body: string;
  audio_key: string | null;
  audio_duration_seconds: number | null;
  published_at: Date | null;
};

type LinhaLeitura = {
  event_id: string;
  session_id: string;
  recado_id: string;
  read_at: Date;
};

function paraRecado(l: LinhaRecado): Recado {
  const audio =
    l.audio_key !== null && l.audio_duration_seconds !== null
      ? { chave: l.audio_key, duracaoSegundos: l.audio_duration_seconds }
      : null;

  return {
    id: l.id,
    eventoId: l.event_id,
    texto: l.body,
    audio,
    publicaEm: l.published_at,
  };
}

function paraLeitura(l: LinhaLeitura): LeituraDoRecado {
  return {
    eventoId: l.event_id,
    sessaoId: l.session_id,
    recadoId: l.recado_id,
    lidoEm: l.read_at,
  };
}

function ehColisao(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}

export class ErroRecadoJaExiste extends Error {
  readonly code = "recado.ja_existe";
  constructor(readonly eventoId: string) {
    super("um recado por evento");
  }
}

export async function recadoDoEvento(
  cliente: PoolClient,
  eventoId: string,
): Promise<Recado | null> {
  const { rows } = await cliente.query<LinhaRecado>(
    `SELECT id, event_id, body, audio_key, audio_duration_seconds, published_at
       FROM recado WHERE event_id = $1`,
    [eventoId],
  );

  const l = rows[0];
  return l ? paraRecado(l) : null;
}

export async function gravarRecado(
  cliente: PoolClient,
  entrada: { eventoId: string; texto: string; publicaEm: Date | null },
): Promise<Recado> {
  try {
    const { rows } = await cliente.query<LinhaRecado>(
      `INSERT INTO recado (event_id, body, published_at)
       VALUES ($1, $2, $3)
       RETURNING id, event_id, body, audio_key, audio_duration_seconds, published_at`,
      [entrada.eventoId, entrada.texto, entrada.publicaEm],
    );
    return paraRecado(rows[0]!);
  } catch (e) {
    if (ehColisao(e)) throw new ErroRecadoJaExiste(entrada.eventoId);
    throw e;
  }
}

export async function atualizarRecado(
  cliente: PoolClient,
  entrada: { eventoId: string; texto: string; publicaEm: Date | null },
): Promise<Recado | null> {
  const { rows } = await cliente.query<LinhaRecado>(
    `UPDATE recado
        SET body = $2, published_at = $3, updated_at = now()
      WHERE event_id = $1
      RETURNING id, event_id, body, audio_key, audio_duration_seconds, published_at`,
    [entrada.eventoId, entrada.texto, entrada.publicaEm],
  );

  const l = rows[0];
  return l ? paraRecado(l) : null;
}

export async function leiturasDoRecado(
  cliente: PoolClient,
  eventoId: string,
  sessaoId: string,
): Promise<LeituraDoRecado[]> {
  const { rows } = await cliente.query<LinhaLeitura>(
    `SELECT event_id, session_id, recado_id, read_at
       FROM recado_lido
      WHERE event_id = $1 AND session_id = $2`,
    [eventoId, sessaoId],
  );

  return rows.map(paraLeitura);
}

export async function marcarRecadoLido(
  cliente: PoolClient,
  entrada: { eventoId: string; sessaoId: string; recadoId: string; lidoEm: Date },
): Promise<{ inserida: boolean }> {
  const { rowCount } = await cliente.query(
    `INSERT INTO recado_lido (event_id, session_id, recado_id, read_at)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (recado_id, session_id) DO NOTHING`,
    [entrada.eventoId, entrada.sessaoId, entrada.recadoId, entrada.lidoEm],
  );

  return { inserida: (rowCount ?? 0) > 0 };
}
