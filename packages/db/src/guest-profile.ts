import type { PoolClient } from "pg";
import { filtroSemBloqueio } from "./block-db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PerfilConvidado = {
  nome: string;
};

/**
 * O nome do dono de um `sessaoAutor` do feed, visto pelos olhos de quem lê —
 * a base do perfil que abre quando o convidado toca no autor de uma foto.
 *
 * Devolve `null` quando o id não existe neste evento (RLS já garante isso: a
 * linha de outra festa nem aparece) ou quando há bloqueio simétrico entre
 * quem lê e quem é dono — a mesma regra que já esconde as fotos dele do feed,
 * repetida aqui para que o perfil não vaze pelo cabeçalho o que a grade já
 * recusa a mostrar.
 */
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
