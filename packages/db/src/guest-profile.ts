import type { PoolClient } from "pg";
import { filtroSemBloqueio } from "./block-db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PerfilConvidado = {
  nome: string;
};

/** Bloqueio simétrico filtra aqui também — o perfil não pode vazar pelo cabeçalho o que a grade do feed já recusa a mostrar. */
export async function perfilDoConvidado(
  cliente: PoolClient,
  entrada: { eventoId: string; autorId: string; leitorId: string },
): Promise<PerfilConvidado | null> {
  if (!UUID.test(entrada.autorId)) return null;

  const { rows } = await cliente.query<{ display_name: string }>(
    `SELECT s.display_name
       FROM guest_sessions s
      WHERE s.id = $1
        AND s.event_id = $3
        AND ${filtroSemBloqueio("s.id", 2)}`,
    [entrada.autorId, entrada.leitorId, entrada.eventoId],
  );

  const linha = rows[0];
  return linha ? { nome: linha.display_name } : null;
}
