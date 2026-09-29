import type { PoolClient } from "pg";
import type { TopicoDaComunidade } from "@albora/core";

/**
 * Comunidade entre anfitriões (ADR 0023). Dado de **conta**, não de evento:
 * todo caminho aqui roda sob `comConta`, nunca sob `comEvento`.
 */

export type { TopicoDaComunidade } from "@albora/core";
export { TOPICOS_DA_COMUNIDADE, ehTopicoDaComunidade } from "@albora/core";

/** ISO-8601 em UTC com os seis dígitos que o `timestamptz` guarda — o que o `Date` do JS perderia. */
const CHAVE = `to_char(p.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

export type PostDaComunidade = {
  id: string;
  accountId: string;
  topico: TopicoDaComunidade;
  titulo: string;
  corpo: string;
  criadoEm: Date;
  /**
   * `created_at` com precisão de microssegundo, como o Postgres o guarda.
   *
   * 🔴 Não dá para paginar por `criadoEm`: o driver entrega `timestamptz` como
   * `Date` do JS, que só tem milissegundo. Um cursor montado a partir dele
   * trunca, e a linha entre o truncado e o real não aparece em página nenhuma —
   * some calada, sem erro.
   */
  chave: string;
  atualizadoEm: Date;
  respostas: number;
  /** Verdadeiro quando o post é de quem está lendo — decide se a ação de apagar aparece. */
  meu: boolean;
};

export type RespostaDaComunidade = {
  id: string;
  postId: string;
  accountId: string;
  corpo: string;
  criadoEm: Date;
  meu: boolean;
};

type LinhaDePost = {
  id: string;
  account_id: string;
  topic: TopicoDaComunidade;
  title: string;
  body: string;
  created_at: Date;
  created_at_chave: string;
  updated_at: Date;
  respostas: string;
  meu: boolean;
};

function montarPost(l: LinhaDePost): PostDaComunidade {
  return {
    id: l.id,
    accountId: l.account_id,
    topico: l.topic,
    titulo: l.title,
    corpo: l.body,
    criadoEm: l.created_at,
    chave: l.created_at_chave,
    atualizadoEm: l.updated_at,
    respostas: Number(l.respostas),
    meu: l.meu,
  };
}

export type FiltroDaComunidade = {
  topico?: TopicoDaComunidade | undefined;
  /** Busca por texto no título e no corpo. */
  termo?: string | undefined;
  limite?: number | undefined;
  /**
   * Paginação por chave, não por OFFSET: o feed é ordenado por data e recebe
   * linha nova no topo o tempo todo, e `OFFSET` nessa condição pula ou repete
   * conversa entre uma página e a seguinte.
   */
  antesDe?: { chave: string; id: string } | undefined;
};

export async function listarPostsDaComunidade(
  cliente: PoolClient,
  contaId: string,
  filtro: FiltroDaComunidade = {},
): Promise<PostDaComunidade[]> {
  const limite = Math.min(Math.max(filtro.limite ?? 30, 1), 100);
  const termo = filtro.termo?.trim();

  const { rows } = await cliente.query<LinhaDePost>(
    `SELECT p.id, p.account_id, p.topic, p.title, p.body, p.created_at, p.updated_at,
            ${CHAVE} AS created_at_chave,
            (SELECT count(*) FROM community_replies r WHERE r.post_id = p.id) AS respostas,
            (p.account_id = $1) AS meu
       FROM community_posts p
      WHERE ($2::text IS NULL OR p.topic = $2)
        AND ($3::text IS NULL OR p.title ILIKE '%' || $3 || '%' OR p.body ILIKE '%' || $3 || '%')
        AND ($5::timestamptz IS NULL OR (p.created_at, p.id) < ($5::timestamptz, $6::uuid))
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $4`,
    [
      contaId,
      filtro.topico ?? null,
      termo && termo.length > 0 ? termo : null,
      limite,
      filtro.antesDe?.chave ?? null,
      filtro.antesDe?.id ?? null,
    ],
  );

  return rows.map(montarPost);
}

export async function lerPostDaComunidade(
  cliente: PoolClient,
  contaId: string,
  postId: string,
): Promise<PostDaComunidade | null> {
  const { rows } = await cliente.query<LinhaDePost>(
    `SELECT p.id, p.account_id, p.topic, p.title, p.body, p.created_at, p.updated_at,
            ${CHAVE} AS created_at_chave,
            (SELECT count(*) FROM community_replies r WHERE r.post_id = p.id) AS respostas,
            (p.account_id = $1) AS meu
       FROM community_posts p
      WHERE p.id = $2`,
    [contaId, postId],
  );

  const linha = rows[0];
  return linha ? montarPost(linha) : null;
}

export async function listarRespostas(
  cliente: PoolClient,
  contaId: string,
  postId: string,
): Promise<RespostaDaComunidade[]> {
  const { rows } = await cliente.query<{
    id: string;
    post_id: string;
    account_id: string;
    body: string;
    created_at: Date;
    meu: boolean;
  }>(
    `SELECT id, post_id, account_id, body, created_at, (account_id = $1) AS meu
       FROM community_replies
      WHERE post_id = $2
      ORDER BY created_at`,
    [contaId, postId],
  );

  return rows.map((l) => ({
    id: l.id,
    postId: l.post_id,
    accountId: l.account_id,
    corpo: l.body,
    criadoEm: l.created_at,
    meu: l.meu,
  }));
}

export async function criarPostDaComunidade(
  cliente: PoolClient,
  entrada: {
    contaId: string;
    topico: TopicoDaComunidade;
    titulo: string;
    corpo: string;
  },
): Promise<string> {
  const { rows } = await cliente.query<{ id: string }>(
    `INSERT INTO community_posts (account_id, topic, title, body)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [entrada.contaId, entrada.topico, entrada.titulo.trim(), entrada.corpo.trim()],
  );

  const id = rows[0]?.id;
  if (!id) throw new Error("community_posts: INSERT não devolveu id");
  return id;
}

export async function responderPost(
  cliente: PoolClient,
  entrada: { contaId: string; postId: string; corpo: string },
): Promise<string> {
  const { rows } = await cliente.query<{ id: string }>(
    `INSERT INTO community_replies (post_id, account_id, body)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [entrada.postId, entrada.contaId, entrada.corpo.trim()],
  );

  const id = rows[0]?.id;
  if (!id) throw new Error("community_replies: INSERT não devolveu id");
  return id;
}

/** A política de autor já recusa linha alheia; o `account_id` no WHERE é o segundo cinto. */
export async function apagarPostDaComunidade(
  cliente: PoolClient,
  contaId: string,
  postId: string,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `DELETE FROM community_posts WHERE id = $1 AND account_id = $2`,
    [postId, contaId],
  );
  return (rowCount ?? 0) > 0;
}

export async function apagarResposta(
  cliente: PoolClient,
  contaId: string,
  respostaId: string,
): Promise<boolean> {
  const { rowCount } = await cliente.query(
    `DELETE FROM community_replies WHERE id = $1 AND account_id = $2`,
    [respostaId, contaId],
  );
  return (rowCount ?? 0) > 0;
}
