import type { DegrauDoFunil, EventoDoFunil } from "@albora/core";
import { degraus, ehEventoDoFunil, parseViaDeEntrada } from "@albora/core";
import type { PoolClient } from "pg";

export type EntradasPorVia = {
  qr: number;
  wa: number;
  link: number;
  code: number;
};

export type FunilAgregado = {
  totalSessoes: number;
  degraus: DegrauDoFunil[];
  uploadsAntesDoFeed: number;
  uploadsDepoisDoFeed: number;
  entradasPorVia: EntradasPorVia;
};

export function contarEntradasPorVia(
  linhas: Iterable<{ via: string; n: number }>,
): EntradasPorVia {
  const saida: EntradasPorVia = { qr: 0, wa: 0, link: 0, code: 0 };
  for (const linha of linhas) {
    saida[parseViaDeEntrada(linha.via)] += linha.n;
  }
  return saida;
}

/** Spec 007 prova 6: `upload_ok` de cada sessão, antes × depois do primeiro `feed_open`. */
export function contarUploadsAntesDepoisDoFeed(
  sequencias: Iterable<readonly EventoDoFunil[]>,
): { antes: number; depois: number } {
  let antes = 0;
  let depois = 0;

  for (const eventos of sequencias) {
    let viuFeed = false;
    for (const name of eventos) {
      if (name === "feed_open") {
        viuFeed = true;
        continue;
      }
      if (name !== "upload_ok") continue;
      if (viuFeed) depois += 1;
      else antes += 1;
    }
  }

  return { antes, depois };
}

/** Funil agregado por sessão (spec 009 B-07) — só leitura, dentro de `comEvento`. */
export async function lerFunilAgregado(
  cliente: PoolClient,
  eventoId: string,
): Promise<FunilAgregado> {
  const [{ rows: totais }, { rows: linhas }, { rows: vias }] = await Promise.all([
    cliente.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM guest_sessions WHERE event_id = $1`,
      [eventoId],
    ),
    cliente.query<{ session_id: string; name: string }>(
      `SELECT session_id, name
         FROM funnel_events
        WHERE event_id = $1 AND session_id IS NOT NULL
        ORDER BY session_id, created_at ASC, id ASC`,
      [eventoId],
    ),
    cliente.query<{ via: string; n: number }>(
      `SELECT via, count(*)::int AS n FROM guest_sessions WHERE event_id = $1 GROUP BY via`,
      [eventoId],
    ),
  ]);

  const porSessao = new Map<string, EventoDoFunil[]>();

  for (const linha of linhas) {
    if (!ehEventoDoFunil(linha.name)) continue;
    const lista = porSessao.get(linha.session_id) ?? [];
    lista.push(linha.name);
    porSessao.set(linha.session_id, lista);
  }

  const sequencias = [...porSessao.values()];
  const { antes, depois } = contarUploadsAntesDepoisDoFeed(sequencias);

  return {
    totalSessoes: totais[0]?.total ?? 0,
    degraus: degraus(sequencias),
    uploadsAntesDoFeed: antes,
    uploadsDepoisDoFeed: depois,
    entradasPorVia: contarEntradasPorVia(vias),
  };
}

/**
 * Quantos `share` este evento teve (spec A1) — `share` já é gravado por
 * `registrarEventoDoFunil`, não é evento único, repete por foto. Índice
 * dedicado em `(event_id, name)` (migration 0039): sem ele o filtro por
 * `name` varre toda a tabela via o FK implícito de `event_id`.
 */
export async function contarSharesDoEvento(cliente: PoolClient, eventoId: string): Promise<number> {
  const { rows } = await cliente.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM funnel_events WHERE event_id = $1 AND name = 'share'`,
    [eventoId],
  );
  return rows[0]?.n ?? 0;
}
