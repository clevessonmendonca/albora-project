import type { PoolClient } from "pg";

export type ResultadoBloqueio = { registrado: boolean };

/** Uma linha, filtra nos dois sentidos; sem aviso ao bloqueado. */
export async function bloquearConvidado(
  cliente: PoolClient,
  entrada: { eventoId: string; bloqueadorId: string; bloqueadoId: string },
): Promise<ResultadoBloqueio> {
  if (entrada.bloqueadorId === entrada.bloqueadoId) {
    return { registrado: false };
  }

  const { rowCount: visivel } = await cliente.query(
    "SELECT 1 FROM guest_sessions WHERE id = $1 AND event_id = $2",
    [entrada.bloqueadoId, entrada.eventoId],
  );
  if ((visivel ?? 0) === 0) throw new ErroSessaoDeOutroEvento(entrada.bloqueadoId);

  const { rowCount } = await cliente.query(
    `INSERT INTO guest_blocks (event_id, blocker_id, blocked_id)
     VALUES (NULLIF(current_setting('app.event_id', true), '')::uuid, $1, $2)
     ON CONFLICT (event_id, blocker_id, blocked_id) DO NOTHING`,
    [entrada.bloqueadorId, entrada.bloqueadoId],
  );

  return { registrado: (rowCount ?? 0) > 0 };
}

/** SQL compartilhado: exclui linhas onde ha bloqueio simetrico com a sessao leitora. */
export function filtroSemBloqueio(aliasSessaoAlvo: string, paramSessaoLeitora: number): string {
  return `NOT EXISTS (
    SELECT 1 FROM guest_blocks gb
     WHERE gb.event_id = NULLIF(current_setting('app.event_id', true), '')::uuid
       AND (
         (gb.blocker_id = $${paramSessaoLeitora} AND gb.blocked_id = ${aliasSessaoAlvo})
         OR (gb.blocker_id = ${aliasSessaoAlvo} AND gb.blocked_id = $${paramSessaoLeitora})
       )
  )`;
}

export class ErroSessaoDeOutroEvento extends Error {
  readonly code = "bloqueio.sessao_ausente";
  constructor(readonly sessaoId: string) {
    super("sessão não pertence a este evento");
  }
}
