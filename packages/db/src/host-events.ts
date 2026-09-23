import type { Pool, PoolClient } from "pg";
import { fusoIanaValido } from "@albora/core";
import { comConta, comEvento } from "./event";

export type AtualizacaoConfigEvento = {
  expectedGuests?: number;
  /** `null` limpa a confirmação e devolve o denominador para a estimativa. */
  actualGuests?: number | null;
  identityTokens?: Record<string, unknown>;
  fuso?: string;
  /** Nome personalizado do evento. String vazia remove (persiste null). */
  title?: string | null;
};

/** Oculta uma foto do feed, álbum e telão (state = removed). Só o anfitrião. */
/** Curadoria, nao moderacao: mexe so em `highlighted_at` e nunca em `state`. So foto publicada entra — destaque invisivel nao serve a ninguem. */
export async function destacarMidiaDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  midiaId: string,
  destacada: boolean,
): Promise<boolean> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return false;

  return comEvento(pool, eventoId, async (c) => {
    const { rowCount } = await c.query(
      destacada
        ? `UPDATE uploads SET highlighted_at = now()
             WHERE id = $1 AND event_id = $2 AND state = 'published' AND highlighted_at IS NULL`
        : `UPDATE uploads SET highlighted_at = NULL
             WHERE id = $1 AND event_id = $2 AND highlighted_at IS NOT NULL`,
      [midiaId, eventoId],
    );

    if ((rowCount ?? 0) > 0) return true;

    const { rows } = await c.query<{ destacada: boolean }>(
      `SELECT (highlighted_at IS NOT NULL) AS destacada
         FROM uploads WHERE id = $1 AND event_id = $2 AND state = 'published'`,
      [midiaId, eventoId],
    );
    return rows[0]?.destacada === destacada;
  });
}

export async function listarDestaques(
  cliente: PoolClient,
  eventoId: string,
): Promise<string[]> {
  const { rows } = await cliente.query<{ id: string }>(
    `SELECT id FROM uploads
      WHERE event_id = $1 AND highlighted_at IS NOT NULL
      ORDER BY highlighted_at DESC`,
    [eventoId],
  );
  return rows.map((l) => l.id);
}

export async function ocultarMidiaDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  midiaId: string,
): Promise<boolean> {
  const pertence = await comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
  if (!pertence) return false;

  return comEvento(pool, eventoId, async (c) => {
    const { rowCount } = await c.query(
      `UPDATE uploads SET state = 'removed' WHERE id = $1 AND event_id = $2 AND state = 'published'`,
      [midiaId, eventoId],
    );
    return (rowCount ?? 0) > 0;
  });
}

/** comConta: política conta_evento impede alterar evento alheio. */
export async function atualizarConfigDoEvento(
  pool: Pool,
  accountId: string,
  eventoId: string,
  atualizacao: AtualizacaoConfigEvento,
): Promise<boolean> {
  const partes: string[] = [];
  const valores: unknown[] = [];

  if (atualizacao.expectedGuests !== undefined) {
    const n = Math.trunc(atualizacao.expectedGuests);
    if (!Number.isFinite(n) || n <= 0) throw new Error("expected_guests inválido");
    valores.push(n);
    partes.push(`expected_guests = $${valores.length}`);
  }

  // `null` é escrita válida aqui: desfaz uma confirmação errada e devolve o
  // denominador para a estimativa, em vez de deixar um número errado fixado.
  if (atualizacao.actualGuests !== undefined) {
    if (atualizacao.actualGuests === null) {
      valores.push(null);
    } else {
      const n = Math.trunc(atualizacao.actualGuests);
      if (!Number.isFinite(n) || n <= 0) throw new Error("actual_guests inválido");
      valores.push(n);
    }
    partes.push(`actual_guests = $${valores.length}`);
  }

  if (atualizacao.identityTokens !== undefined) {
    valores.push(JSON.stringify(atualizacao.identityTokens));
    partes.push(`identity_tokens = $${valores.length}`);
  }

  if (atualizacao.fuso !== undefined) {
    if (!fusoIanaValido(atualizacao.fuso)) throw new Error("timezone inválido");
    valores.push(atualizacao.fuso);
    partes.push(`timezone = $${valores.length}`);
  }

  if (atualizacao.title !== undefined) {
    const t = typeof atualizacao.title === "string" ? atualizacao.title.trim() || null : null;
    valores.push(t);
    partes.push(`title = $${valores.length}`);
  }

  if (partes.length === 0) return true;

  return comConta(pool, accountId, async (c) => {
    valores.push(eventoId);
    const { rowCount } = await c.query(
      `UPDATE events SET ${partes.join(", ")} WHERE id = $${valores.length}`,
      valores,
    );
    return (rowCount ?? 0) > 0;
  });
}
