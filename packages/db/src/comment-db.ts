import type { PoolClient } from "pg";

const PUBLICADO = "published";
const REMOVIDO = "removed";

/**
 * A forma do comentário como o núcleo (`@albora/core`) o conhece: `respostaA`
 * é `parent_id`, `midiaId` é `upload_id`. Espelha `Comentario` do core de
 * propósito — este pacote repete a forma para poder alimentar `montarThread` e
 * `publicarComentario` sem que a fronteira `pack → core` seja invertida por um
 * import.
 */
export type ComentarioGravado = {
  id: string;
  eventoId: string;
  midiaId: string;
  sessaoId: string;
  texto: string;
  respostaA: string | null;
  criadoEm: Date;
};

/** Um comentário para exibição: o gravado, mais o primeiro nome de quem comentou. */
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

/**
 * Os comentários publicados de uma foto, do mais antigo para o mais novo, de
 * dentro de uma transação já escopada por `comEvento`.
 *
 * Serve às duas leituras: alimenta `montarThread` na exibição, e é a lista de
 * existentes que `publicarComentario` usa para ancorar uma resposta na raiz. O
 * `event_id` no WHERE é redundante sob RLS e vai mesmo assim — duas camadas
 * para a mesma invariante, como no resto do pacote. O JOIN em `guest_sessions`
 * deixa de fora comentário cujo autor já não existe (`session_id` nulo).
 */
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

/**
 * Grava o comentário, uma vez só.
 *
 * O `event_id` **não vem do cliente**: vem da sessão, e a RLS ainda o confere —
 * duas camadas para a mesma invariante. `ON CONFLICT (id) DO NOTHING` faz um
 * retry com o mesmo id devolver a linha existente em vez de duplicar; um id
 * que conflita mas não é visível pertence a outro evento (a RLS o esconde), e a
 * resposta correta é a mesma de "não existe" — dizê-lo já vazaria informação.
 */
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

/**
 * Remoção suave pelo autor: marca `removed`, e o comentário some de toda
 * leitura, que só lê `published`.
 *
 * O `session_id` no WHERE é o que impede um convidado de apagar o comentário de
 * outro — a RLS garante o evento, ela não sabe de quem é o comentário dentro
 * dele. É a mesma guarda de `anotarUpload`. Devolve `false` quando nada casou —
 * sessão errada ou comentário que sumiu — nunca erro.
 */
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
