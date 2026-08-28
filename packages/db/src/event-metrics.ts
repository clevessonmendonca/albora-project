import type { PoolClient } from "pg";
import { thumbKeyFromFull } from "./storage-key";
import { contarSharesDoEvento } from "./funnel-aggregate";

export type FotoRecente = {
  id: string;
  chaveThumb: string;
  criadaEm: Date;
};

export type MetricasAoVivo = {
  sessoesComUpload: number;
  totalFotos: number;
  ultimas: FotoRecente[];
  /** Quantos `share` este evento teve (spec A1) — sinal de viralidade, opcional pro painel. */
  sharesTotais: number;
};

/** Contagens do painel ao vivo (spec 009) — só leitura, dentro de `comEvento`. */
export async function lerMetricasAoVivo(
  cliente: PoolClient,
  eventoId: string,
): Promise<MetricasAoVivo> {
  const { rows: agregado } = await cliente.query<{ sessoes: number; fotos: number }>(
    `SELECT count(DISTINCT session_id)::int AS sessoes,
            count(*)::int AS fotos
       FROM uploads
      WHERE event_id = $1 AND state = 'published'`,
    [eventoId],
  );

  const linha = agregado[0] ?? { sessoes: 0, fotos: 0 };

  const [{ rows: recentes }, sharesTotais] = await Promise.all([
    cliente.query<{
      id: string;
      storage_key: string;
      created_at: Date;
    }>(
      `SELECT id, storage_key, created_at
         FROM uploads
        WHERE event_id = $1 AND state = 'published'
        ORDER BY created_at DESC, id DESC
        LIMIT 4`,
      [eventoId],
    ),
    contarSharesDoEvento(cliente, eventoId),
  ]);

  return {
    sessoesComUpload: linha.sessoes,
    totalFotos: linha.fotos,
    ultimas: recentes.map((r) => ({
      id: r.id,
      chaveThumb: thumbKeyFromFull(r.storage_key),
      criadaEm: r.created_at,
    })),
    sharesTotais,
  };
}
