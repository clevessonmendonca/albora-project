import type { PoolClient } from "pg";
import { filtroSemBloqueio } from "./block-db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PerfilConvidado = {
  nome: string;
  totalFotos: number;
  totalCurtidas: number;
};

/** Bloqueio simétrico filtra aqui também — o perfil não pode vazar pelo cabeçalho o que a grade do feed já recusa a mostrar. */
export async function perfilDoConvidado(
  cliente: PoolClient,
  entrada: { eventoId: string; autorId: string; leitorId: string },
): Promise<PerfilConvidado | null> {
  if (!UUID.test(entrada.autorId)) return null;

  const { rows } = await cliente.query<{
    display_name: string;
    total_fotos: number;
    total_curtidas: number;
  }>(
    `SELECT s.display_name,
            (SELECT count(*)::int
               FROM uploads u
              WHERE u.session_id = s.id
                AND u.event_id = $3
                AND u.state = 'published') AS total_fotos,
            (SELECT count(*)::int
               FROM reactions r
               JOIN uploads u ON u.id = r.upload_id AND u.event_id = r.event_id
              WHERE u.session_id = s.id
                AND u.event_id = $3
                AND u.state = 'published') AS total_curtidas
       FROM guest_sessions s
      WHERE s.id = $1
        AND s.event_id = $3
        AND ${filtroSemBloqueio("s.id", 2)}`,
    [entrada.autorId, entrada.leitorId, entrada.eventoId],
  );

  const linha = rows[0];
  return linha
    ? { nome: linha.display_name, totalFotos: linha.total_fotos, totalCurtidas: linha.total_curtidas }
    : null;
}
