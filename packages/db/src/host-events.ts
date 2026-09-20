import type { Pool } from "pg";
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

/** Carimba a visita do anfitrião ao álbum. Base do "novas para você". */
export async function marcarAlbumVisto(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<boolean> {
  if (!(await contaEDonaDoEvento(pool, accountId, eventoId))) return false;

  return comEvento(pool, eventoId, async (c) => {
    const { rowCount } = await c.query(
      "UPDATE events SET host_seen_album_at = now() WHERE id = $1",
      [eventoId],
    );
    return (rowCount ?? 0) > 0;
  });
}

/** `true` se a conta é dona do evento — a RLS de `conta_evento` faz o filtro. */
async function contaEDonaDoEvento(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<boolean> {
  return comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query("SELECT 1 FROM events WHERE id = $1", [eventoId]);
    return (rowCount ?? 0) > 0;
  });
}

async function mudarEstadoDaMidia(
  pool: Pool,
  accountId: string,
  eventoId: string,
  midiaId: string,
  de: string,
  para: string,
): Promise<boolean> {
  if (!(await contaEDonaDoEvento(pool, accountId, eventoId))) return false;

  return comEvento(pool, eventoId, async (c) => {
    const { rowCount } = await c.query(
      `UPDATE uploads SET state = $4 WHERE id = $1 AND event_id = $2 AND state = $3`,
      [midiaId, eventoId, de, para],
    );
    return (rowCount ?? 0) > 0;
  });
}

/**
 * Tira a foto do feed, do álbum e do telão — e dá para desfazer.
 *
 * `hidden` some sozinho de toda leitura de mídia, que filtra por `published`.
 * Até a 0075 isto gravava `removed`, o mesmo que remover de vez: o anfitrião
 * que ocultasse a foto errada não tinha volta.
 */
export async function ocultarMidiaDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  midiaId: string,
): Promise<boolean> {
  return mudarEstadoDaMidia(pool, accountId, eventoId, midiaId, "published", "hidden");
}

/** Desfaz o ocultar. Só volta o que o anfitrião ocultou — nunca o que foi removido. */
export async function reexibirMidiaDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  midiaId: string,
): Promise<boolean> {
  return mudarEstadoDaMidia(pool, accountId, eventoId, midiaId, "hidden", "published");
}

/**
 * Remove de vez. Sem volta pelo painel — o `removed` só sai da tabela no
 * apagamento da retenção. Aceita foto já oculta para o anfitrião poder
 * escalar de "tirei do álbum" para "não quero isso em lugar nenhum".
 */
export async function removerMidiaDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  midiaId: string,
): Promise<boolean> {
  if (!(await contaEDonaDoEvento(pool, accountId, eventoId))) return false;

  return comEvento(pool, eventoId, async (c) => {
    const { rowCount } = await c.query(
      `UPDATE uploads SET state = 'removed'
        WHERE id = $1 AND event_id = $2 AND state IN ('published', 'hidden')`,
      [midiaId, eventoId],
    );
    return (rowCount ?? 0) > 0;
  });
}

/**
 * Destaca ou tira o destaque. É a escolha do casal sobre a própria festa, e o
 * telão, o Reviver e o álbum impresso leem daqui — não dos escores de
 * `curation`, que são palpite de classificador.
 */
export async function destacarMidiaDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
  midiaId: string,
  destacada: boolean,
): Promise<boolean> {
  if (!(await contaEDonaDoEvento(pool, accountId, eventoId))) return false;

  return comEvento(pool, eventoId, async (c) => {
    const { rowCount } = await c.query(
      `UPDATE uploads SET starred_at = CASE WHEN $3 THEN now() ELSE NULL END
        WHERE id = $1 AND event_id = $2 AND state = 'published'`,
      [midiaId, eventoId, destacada],
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
