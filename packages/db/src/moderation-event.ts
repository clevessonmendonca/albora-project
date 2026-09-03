import {
  denunciasParaSegurar,
  fusoOuPadrao,
  parsePlanoDoEvento,
  type EstadoDoEvento,
  type PlanoDoEvento,
} from "@albora/core";
import type { Pool, PoolClient } from "pg";
import { comConta, comEvento } from "./event";

export type EstadoModeracao = {
  panico: boolean;
  modoEndurecido: boolean;
  haMenores: boolean;
};

export type ResumoEvento = {
  eventoId: string;
  slug: string;
  packId: string;
  comecaEm: Date;
  terminaEm: Date;
};

export type EventoDoHost = ResumoEvento & {
  moderacao: EstadoModeracao;
  interacaoAbreEm: Date | null;
  expectedGuests: number;
  actualGuests: number | null;
  identityTokens: Record<string, unknown>;
  fuso: string;
  plan: PlanoDoEvento;
  title: string | null;
  coverImageKey: string | null;
};

export type AtualizacaoModeracao = Partial<EstadoModeracao>;

type LinhaCompleta = {
  id: string;
  slug: string;
  pack_id: string;
  starts_at: Date;
  ends_at: Date;
  panic: boolean;
  hardened: boolean;
  has_minors: boolean;
  interaction_opens_at: Date | null;
  expected_guests: number;
  actual_guests: number | null;
  identity_tokens: Record<string, unknown>;
  timezone: string;
  plan: string;
  title: string | null;
  cover_image_key: string | null;
};

const COLUNAS =
  "id, slug, pack_id, starts_at, ends_at, panic, hardened, has_minors, interaction_opens_at, expected_guests, actual_guests, identity_tokens, timezone, plan, title, cover_image_key";

function mapModeracao(l: Pick<LinhaCompleta, "panic" | "hardened" | "has_minors">): EstadoModeracao {
  return {
    panico: l.panic,
    modoEndurecido: l.hardened,
    haMenores: l.has_minors,
  };
}

function mapEvento(l: LinhaCompleta): EventoDoHost {
  return {
    eventoId: l.id,
    slug: l.slug,
    packId: l.pack_id,
    comecaEm: l.starts_at,
    terminaEm: l.ends_at,
    interacaoAbreEm: l.interaction_opens_at,
    expectedGuests: l.expected_guests,
    actualGuests: l.actual_guests,
    identityTokens: l.identity_tokens ?? {},
    fuso: fusoOuPadrao(l.timezone),
    plan: parsePlanoDoEvento(l.plan),
    title: l.title,
    coverImageKey: l.cover_image_key ?? null,
    moderacao: mapModeracao(l),
  };
}

export async function listarEventosDoHost(
  pool: Pool,
  accountId: string,
): Promise<ResumoEvento[]> {
  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query<Omit<LinhaCompleta, "panic" | "hardened" | "has_minors">>(
      `SELECT id, slug, pack_id, starts_at, ends_at
         FROM events
        ORDER BY starts_at DESC`,
    );
    return rows.map((l) => ({
      eventoId: l.id,
      slug: l.slug,
      packId: l.pack_id,
      comecaEm: l.starts_at,
      terminaEm: l.ends_at,
    }));
  });
}

export async function buscarEventoDoHost(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<EventoDoHost | null> {
  return comConta(pool, accountId, async (c) => {
    const { rows } = await c.query<LinhaCompleta>(
      `SELECT ${COLUNAS} FROM events WHERE id = $1`,
      [eventoId],
    );
    const linha = rows[0];
    return linha ? mapEvento(linha) : null;
  });
}

/** comConta: política conta_evento impede alterar evento de outra conta. null se não existe ou não pertence ao host. */
export async function atualizarModeracaoDoEvento(
  pool: Pool,
  accountId: string,
  eventoId: string,
  atualizacao: AtualizacaoModeracao,
): Promise<EventoDoHost | null> {
  const partes: string[] = [];
  const valores: unknown[] = [];

  if (atualizacao.panico !== undefined) {
    valores.push(atualizacao.panico);
    partes.push(`panic = $${valores.length}`);
  }
  if (atualizacao.modoEndurecido !== undefined) {
    valores.push(atualizacao.modoEndurecido);
    partes.push(`hardened = $${valores.length}`);
  }
  if (atualizacao.haMenores !== undefined) {
    valores.push(atualizacao.haMenores);
    partes.push(`has_minors = $${valores.length}`);
  }

  if (partes.length === 0) {
    return buscarEventoDoHost(pool, accountId, eventoId);
  }

  return comConta(pool, accountId, async (c) => {
    valores.push(eventoId);
    const { rowCount } = await c.query(
      `UPDATE events SET ${partes.join(", ")} WHERE id = $${valores.length}`,
      valores,
    );
    if (!rowCount) return null;

    const { rows } = await c.query<LinhaCompleta>(
      `SELECT ${COLUNAS} FROM events WHERE id = $1`,
      [eventoId],
    );
    return rows[0] ? mapEvento(rows[0]) : null;
  });
}

/** Abre o gate de interação na hora (spec 009, ADR 0009). */
export async function abrirInteracaoDoEvento(
  pool: Pool,
  accountId: string,
  eventoId: string,
): Promise<EventoDoHost | null> {
  return comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query(
      `UPDATE events SET interaction_opens_at = now() WHERE id = $1`,
      [eventoId],
    );
    if (!rowCount) return null;

    const { rows } = await c.query<LinhaCompleta>(
      `SELECT ${COLUNAS} FROM events WHERE id = $1`,
      [eventoId],
    );
    return rows[0] ? mapEvento(rows[0]) : null;
  });
}

/** null fecha o gate de volta; instantes no passado equivalem a aberto agora. */
export async function agendarInteracaoDoEvento(
  pool: Pool,
  accountId: string,
  eventoId: string,
  abreEm: Date | null,
): Promise<EventoDoHost | null> {
  return comConta(pool, accountId, async (c) => {
    const { rowCount } = await c.query(
      `UPDATE events SET interaction_opens_at = $2 WHERE id = $1`,
      [eventoId, abreEm],
    );
    if (!rowCount) return null;

    const { rows } = await c.query<LinhaCompleta>(
      `SELECT ${COLUNAS} FROM events WHERE id = $1`,
      [eventoId],
    );
    return rows[0] ? mapEvento(rows[0]) : null;
  });
}

/** Crachá da parede usa comEvento, não comConta — quem pausa a exibição não é necessariamente o host. */
export async function alternarPanicoDoEvento(
  pool: Pool,
  eventoId: string,
): Promise<boolean | null> {
  return comEvento(pool, eventoId, async (c) => {
    const { rows } = await c.query<{ panic: boolean }>(
      `UPDATE events SET panic = NOT panic WHERE id = $1 RETURNING panic`,
      [eventoId],
    );
    return rows[0]?.panic ?? null;
  });
}

/** Leitura dentro de transacao ja escopada por `comEvento`. */
export async function lerModeracaoDoEvento(
  cliente: PoolClient,
  eventoId: string,
): Promise<EstadoModeracao> {
  const { rows } = await cliente.query<{
    panic: boolean;
    hardened: boolean;
    has_minors: boolean;
  }>("SELECT panic, hardened, has_minors FROM events WHERE id = $1", [eventoId]);

  const l = rows[0];
  return l
    ? mapModeracao(l)
    : { panico: false, modoEndurecido: false, haMenores: false };
}

export function paraEstadoDoEvento(m: EstadoModeracao): EstadoDoEvento {
  return { panico: m.panico, modoEndurecido: m.modoEndurecido };
}

export function limiarDenuncias(m: EstadoModeracao): number {
  return denunciasParaSegurar({ haMenores: m.haMenores });
}
