import type { PoolClient } from "pg";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type Desafio = {
  id: string;
  /** Chave de vocabulário resolvida pelo pack. Nunca texto pronto. */
  chaveTitulo: string;
  ordem: number;
  /** Se **esta** sessão já mandou foto para ele. */
  feito: boolean;
};

/**
 * As missões do evento, com o que esta sessão já fez.
 *
 * O `LEFT JOIN` é por sessão, não por evento: "feito" tem de significar *você*
 * fez, senão a lista some para quem chegou depois — e chegar depois é o caso
 * comum, não a exceção.
 *
 * O `event_id` não aparece no `WHERE` porque a RLS já o aplica; ele está aqui
 * assim mesmo, na junção, porque uma política é uma linha de defesa e duas são
 * duas.
 */
export async function listarDesafios(
  cliente: PoolClient,
  eventoId: string,
  sessaoId: string | null,
): Promise<Desafio[]> {
  const { rows } = await cliente.query<{
    id: string;
    title_key: string;
    position: number;
    feito: boolean;
  }>(
    `SELECT c.id, c.title_key, c.position,
            EXISTS (
              SELECT 1 FROM uploads u
              WHERE u.challenge_id = c.id AND u.session_id = $2
            ) AS feito
     FROM challenges c
     WHERE c.event_id = $1
     ORDER BY c.position`,
    [eventoId, sessaoId],
  );

  return rows.map((l) => ({
    id: l.id,
    chaveTitulo: l.title_key,
    ordem: l.position,
    feito: l.feito,
  }));
}

/**
 * Confere que a missão pertence a este evento antes de ela virar coluna.
 *
 * O id vem do cliente, e um id de outro casamento gravado aqui vazaria a
 * existência daquele evento pela porta dos fundos. A RLS já recusaria a FK,
 * mas o erro chegaria como violação de integridade — que é o tipo de falha que
 * o convidado vê como "não consegui enviar sua foto".
 */
export async function desafioDoEvento(
  cliente: PoolClient,
  eventoId: string,
  desafioId: string,
): Promise<boolean> {
  // Postgres estoura ao comparar uuid com texto que não é uuid. Um `false`
  // aqui vira "sem missão" na foto; uma exceção viraria 500 no caminho
  // crítico de sábado às 20h.
  if (!UUID.test(desafioId)) return false;

  const { rowCount } = await cliente.query(
    "SELECT 1 FROM challenges WHERE id = $1 AND event_id = $2",
    [desafioId, eventoId],
  );

  return (rowCount ?? 0) > 0;
}
