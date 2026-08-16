import type { Pool } from "pg";
import { fusoIanaValido } from "@albora/core";
import { comConta, comEvento } from "./event";

export type AtualizacaoConfigEvento = {
  expectedGuests?: number;
  identityTokens?: Record<string, unknown>;
  fuso?: string;
};

/** Oculta uma foto do feed, álbum e telão (state = removed). Só o anfitrião. */
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

/**
 * Atualiza identidade, fuso e convidados esperados (spec 009 B-03).
 *
 * Roda em `comConta`: a política `conta_evento` impede alterar evento alheio.
 */
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

  if (atualizacao.identityTokens !== undefined) {
    valores.push(JSON.stringify(atualizacao.identityTokens));
    partes.push(`identity_tokens = $${valores.length}`);
  }

  if (atualizacao.fuso !== undefined) {
    if (!fusoIanaValido(atualizacao.fuso)) throw new Error("timezone inválido");
    valores.push(atualizacao.fuso);
    partes.push(`timezone = $${valores.length}`);
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
