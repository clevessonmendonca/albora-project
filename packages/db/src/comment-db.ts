import type { PoolClient } from "pg";

const PUBLICADO = "published";
const REMOVIDO = "removed";

/** Espelha Comentario do core para alimentar montarThread sem inverter a dependência pack → core. */
export type ComentarioGravado = {
  id: string;
  eventoId: string;
  midiaId: string;
  sessaoId: string;
  texto: string;
  respostaA: string | null;
  criadoEm: Date;
};

export type ComentarioComAutor = ComentarioGravado & {
  /** Concessão `ler.identidade`: o primeiro nome de quem comentou, nunca o contato. */
  autor: string;
};

type LinhaComAutor = {
  id: string;
  event_id: string;
  upload_id: string;
  session_id: string;
  body: string;
  parent_id: string | null;
  created_at: Date;
  display_name: string;
};

type LinhaGravada = {
  id: string;
  event_id: string;
  upload_id: string;
  session_id: string;
  body: string;
  parent_id: string | null;
  created_at: Date;
};

function paraComAutor(l: LinhaComAutor): ComentarioComAutor {
  return {
    id: l.id,
    eventoId: l.event_id,
    midiaId: l.upload_id,
    sessaoId: l.session_id,
    texto: l.body,
    respostaA: l.parent_id,
    criadoEm: l.created_at,
    autor: l.display_name,
  };
}

function paraGravado(l: LinhaGravada): ComentarioGravado {
  return {
    id: l.id,
    eventoId: l.event_id,
    midiaId: l.upload_id,
    sessaoId: l.session_id,
    texto: l.body,
    respostaA: l.parent_id,
    criadoEm: l.created_at,
  };
}

/** event_id no WHERE é redundante sob RLS — duas camadas para a mesma invariante. JOIN exclui comentário de sessão inexistente. */
export async function listarComentariosDaFoto(
  cliente: PoolClient,
  eventoId: string,
  uploadId: string,
): Promise<ComentarioComAutor[]> {
  const { rows } = await cliente.query<LinhaComAutor>(
    `SELECT c.id, c.event_id, c.upload_id, c.session_id, c.body, c.parent_id,
            c.created_at, s.display_name
       FROM comments c
       JOIN guest_sessions s ON s.id = c.session_id AND s.event_id = c.event_id
      WHERE c.event_id = $1 AND c.upload_id = $2 AND c.state = $3
      ORDER BY c.created_at ASC, c.id ASC`,
    [eventoId, uploadId, PUBLICADO],
  );

  return rows.map(paraComAutor);
}

/** 🔴 event_id vem da sessão, não do cliente. ON CONFLICT (id) DO NOTHING: retry devolve existente; id invisível pertence a outro evento. */
export async function gravarComentario(
  cliente: PoolClient,
  entrada: {
    id: string;
    eventoId: string;
    midiaId: string;
    sessaoId: string;
    respostaA: string | null;
    texto: string;
  },
): Promise<ComentarioGravado> {
  const { rows: inseridas } = await cliente.query<LinhaGravada>(
    `INSERT INTO comments (id, event_id, upload_id, session_id, parent_id, body)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO NOTHING
     RETURNING id, event_id, upload_id, session_id, parent_id, body, created_at`,
    [entrada.id, entrada.eventoId, entrada.midiaId, entrada.sessaoId, entrada.respostaA, entrada.texto],
  );

  const criada = inseridas[0];
  if (criada) return paraGravado(criada);

  const { rows: existentes } = await cliente.query<LinhaGravada>(
    `SELECT id, event_id, upload_id, session_id, parent_id, body, created_at
       FROM comments WHERE id = $1`,
    [entrada.id],
  );

  const existente = existentes[0];
  if (!existente) throw new ErroComentarioDeOutroEvento(entrada.id);

  return paraGravado(existente);
}

/** session_id no WHERE impede apagar comentário de outro convidado — RLS garante o evento, não a autoria. */
export async function removerComentario(
  cliente: PoolClient,
  entrada: { comentarioId: string; sessaoId: string },
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `UPDATE comments
        SET state = $3
      WHERE id = $1 AND session_id = $2 AND state <> $3`,
    [entrada.comentarioId, entrada.sessaoId, REMOVIDO],
  );

  return (rowCount ?? 0) > 0;
}

/** Remoção pelo anfitrião: qualquer comentário publicado do evento (spec 014). */
export async function removerComentarioDoEvento(
  cliente: PoolClient,
  comentarioId: string,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `UPDATE comments SET state = $2 WHERE id = $1 AND state <> $2`,
    [comentarioId, REMOVIDO],
  );

  return (rowCount ?? 0) > 0;
}

export async function gravarVeredictoComentario(
  cliente: PoolClient,
  comentarioId: string,
  veredicto: string,
): Promise<void> {
  await cliente.query(`UPDATE comments SET classifier_verdict = $2 WHERE id = $1`, [
    comentarioId,
    veredicto,
  ]);
}

export class ErroComentarioDeOutroEvento extends Error {
  readonly code = "comentario.conflito_entre_eventos";
  constructor(readonly comentarioId: string) {
    super("id de comentário já usado fora deste evento");
  }
}
