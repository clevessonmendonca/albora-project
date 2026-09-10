import type { Pool, PoolClient } from "pg";
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

export type MetricasDeListagem = { sessoesComUpload: number; totalFotos: number };

/**
 * Os dois números que a listagem do console precisa, para muitos eventos numa
 * consulta só.
 *
 * `lerMetricasAoVivo` existe para UM evento e traz junto as últimas fotos e a
 * contagem de shares; `collectEventLiveMetrics` ainda soma o funil agregado.
 * A listagem descarta tudo isso e usa apenas fotos e sessões com upload —
 * pagar por evento, em série, o custo de duas consultas mais o funil era o
 * N+1 que segurava a tela de Eventos e limitava a faixa de "acontecendo
 * agora".
 *
 * Cross-evento por desenho: roda sob `withPlatformAggregation`, no papel
 * `albora_agregador` (BYPASSRLS). Por isso não passa por `comEvento` — não há
 * um `app.event_id` a definir quando o recorte é a plataforma inteira.
 * Evento sem upload não volta da consulta e vale zero, nunca ausência.
 */
export async function lerMetricasDeEventos(
  pool: Pool,
  eventoIds: readonly string[],
): Promise<Map<string, MetricasDeListagem>> {
  const mapa = new Map<string, MetricasDeListagem>();
  if (eventoIds.length === 0) return mapa;

  const { rows } = await pool.query<{ event_id: string; sessoes: number; fotos: number }>(
    `SELECT event_id,
            count(DISTINCT session_id)::int AS sessoes,
            count(*)::int AS fotos
       FROM uploads
      WHERE event_id = ANY($1::uuid[]) AND state = 'published'
      GROUP BY event_id`,
    [[...eventoIds]],
  );

  for (const linha of rows) {
    mapa.set(linha.event_id, { sessoesComUpload: linha.sessoes, totalFotos: linha.fotos });
  }
  return mapa;
}
