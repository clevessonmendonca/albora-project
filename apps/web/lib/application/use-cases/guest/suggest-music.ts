/**
 * Use Case: Suggest Music
 * 
 * Adiciona sugestão de música à fila do evento.
 */

import {
  chaveDaFaixa,
  ordenarSugestoes,
  parseMusicLink,
  registrarSugestao,
  type MetadadoDaMusica,
} from "@albora/core";
import {
  adicionarSugestao,
  withEvent,
  eventGate,
  listarSugestoes,
} from "@albora/db";
import type { Pool } from "pg";
import { buscarMetadadoDaMusica } from "@/lib/music-metadata";

export type SuggestMusicInput = {
  eventoId: string;
  sessaoId: string;
  url: string;
};

export type SuggestMusicResult =
  | { ok: true; sugestoes: Awaited<ReturnType<typeof listarSugestoes>> }
  | { ok: false; code: string; message: string; details?: Record<string, unknown> };

/**
 * Adiciona sugestão de música.
 * 
 * Validações:
 * - Link válido (Spotify, YouTube, etc)
 * - Gate aberto
 * - Respeitando limites do evento
 * 
 * @param input - eventoId, sessaoId e URL da música
 * @param pool - Pool de conexões
 * @returns Sugestões atualizadas ou erro
 */
export async function suggestMusic(
  input: SuggestMusicInput,
  pool: Pool,
): Promise<SuggestMusicResult> {
  const lido = parseMusicLink(input.url);
  if (!lido.ok) {
    console.warn("musica.link_recusado", {
      eventoId: input.eventoId,
      code: lido.erro.code,
    });
    return {
      ok: false,
      code: lido.erro.code,
      message: "Link não aceito",
      details: lido.erro.details,
    };
  }

  const link = lido.link;
  const chave = chaveDaFaixa(link);

  let metadado: MetadadoDaMusica | null = null;
  try {
    const filaAtual = await withEvent(pool, input.eventoId, (c) =>
      listarSugestoes(c, input.eventoId),
    );
    const existente = filaAtual.find((f) => f.chave === chave);
    metadado = existente?.metadado?.titulo
      ? (existente.metadado ?? null)
      : await buscarMetadadoDaMusica(link);
  } catch {
    metadado = null;
  }

  const resultado = await withEvent(pool, input.eventoId, async (c) => {
    const gate = await eventGate(c, input.eventoId);
    if (!gate) return { tipo: "fechado" as const };

    const fila = await listarSugestoes(c, input.eventoId);
    const decisao = registrarSugestao(
      fila,
      { sessaoId: input.sessaoId, link },
      gate,
      new Date(),
    );
    if (!decisao.ok) return { tipo: "recusada" as const, erro: decisao.erro };

    await adicionarSugestao(c, {
      eventoId: input.eventoId,
      sessaoId: input.sessaoId,
      link,
      metadado,
    });
    const atual = ordenarSugestoes(await listarSugestoes(c, input.eventoId));
    return { tipo: "aceita" as const, fila: atual };
  });

  if (resultado.tipo === "fechado") {
    return {
      ok: false,
      code: "musica.interacao_fechada",
      message: "A interação ainda não abriu",
    };
  }

  if (resultado.tipo === "recusada") {
    return {
      ok: false,
      code: resultado.erro.code,
      message: "Sugestão recusada",
      details: resultado.erro.details,
    };
  }

  console.log("musica.sugestao", {
    eventoId: input.eventoId,
    sessaoId: input.sessaoId,
    provedor: link.provedor,
  });

  return { ok: true, sugestoes: resultado.fila };
}
