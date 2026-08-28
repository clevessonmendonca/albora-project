/**
 * Use Case: Get Wall Feed
 *
 * Busca feed de fotos para o telão do evento.
 */
import {
  withEvent,
  listarMidiaDaParede,
  lerModeracaoDoEvento,
} from "@albora/db";
import { wallDisplayRotationModels, type WallDisplayModel } from "@albora/core";
import type { Pool } from "pg";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

export type WallMediaItem = {
  id: string;
  autor: string;
  mime: string;
  criadaEm: string;
  reacoes: number;
  thumb: string;
  full: string;
  largura?: number;
  altura?: number;
};

export type WallCounters = {
  fotos: number;
  convidados: number;
};

export type GetWallFeedInput = {
  eventoId: string;
};

export type GetWallFeedOutput = {
  itens: WallMediaItem[];
  expiraEm: number;
  panico: boolean;
  telaoModelos: WallDisplayModel[];
  contadores: WallCounters;
};

export async function getWallFeed(
  input: GetWallFeedInput,
  pool: Pool,
): Promise<GetWallFeedOutput> {
  const page = await withEvent(pool, input.eventoId, async (c) => {
    const moderacao = await lerModeracaoDoEvento(c, input.eventoId);
    const lista = await listarMidiaDaParede(c, input.eventoId);
    
    const { rows } = await c.query<{ identity_tokens: Record<string, unknown> }>(
      "SELECT identity_tokens FROM events WHERE id = $1",
      [input.eventoId],
    );
    const tokens = rows[0]?.identity_tokens ?? {};
    const telaoModelos = wallDisplayRotationModels(tokens.telaoModelos) as WallDisplayModel[];
    
    // Contagem total do evento (não a janela capada de `listarMidiaDaParede`) para o "N fotos · M pessoas" honesto do telão — RLS de `withEvent` garante que o COUNT não cruza eventos; `::int` pro node-pg devolver número.
    const { rows: contagem } = await c.query<{ fotos: number; convidados: number }>(
      `SELECT COUNT(*)::int AS fotos,
              COUNT(DISTINCT session_id)::int AS convidados
         FROM uploads WHERE state = 'published'`,
    );
    const contadores = contagem[0] ?? { fotos: 0, convidados: 0 };
    
    return { moderacao, lista, telaoModelos, contadores };
  });

  const expiraEm = Date.now() + GET_TTL_SECONDS * 1000;

  const itens = await Promise.all(
    page.lista.map(async (m) => ({
      id: m.id,
      autor: m.autor,
      mime: m.mime,
      criadaEm: m.criadaEm.toISOString(),
      reacoes: m.reacoes,
      thumb: await assinarGet(m.chaveThumb, GET_TTL_SECONDS),
      full: await assinarGet(m.chaveFull, GET_TTL_SECONDS),
      ...(m.largura !== undefined && m.altura !== undefined
        ? { largura: m.largura, altura: m.altura }
        : {}),
    })),
  );

  console.log("parede.pagina", { eventoId: input.eventoId, itens: itens.length });

  return {
    itens,
    expiraEm,
    panico: page.moderacao.panico,
    telaoModelos: page.telaoModelos,
    contadores: page.contadores,
  };
}

export { GET_TTL_SECONDS };
