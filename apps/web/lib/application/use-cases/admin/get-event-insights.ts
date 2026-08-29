/**
 * Use Case: Get Event Insights
 * 
 * Carrega insights de um evento (fotos por missão, fotos por hora).
 */

import { fotosPorMissao, fotosPorHora, withEvent } from "@albora/db";
import { PACKS, resolvePackText } from "@albora/packs";
import type { Pool } from "pg";

export type ChallengeStat = {
  challengeId: string;
  titulo: string;
  emoji: string | null;
  fotos: number;
};

export type HourStat = {
  hora: string;
  fotos: number;
};

export type GetEventInsightsInput = {
  eventId: string;
  packId: string | null;
  fuso: string;
};

export type GetEventInsightsOutput = {
  missoes: ChallengeStat[];
  horas: HourStat[];
};

/**
 * Carrega insights do evento (fotos por missão e fotos por hora).
 * 
 * Usado no dashboard admin para visualizar distribuição de uploads.
 * 
 * @param input - eventId, packId e fuso do evento
 * @param pool - Pool de conexões
 * @returns Estatísticas de missões e horas
 */
export async function getEventInsights(
  input: GetEventInsightsInput,
  pool: Pool,
): Promise<GetEventInsightsOutput> {
  const [missoes, horas] = await withEvent(pool, input.eventId, (c) =>
    Promise.all([
      fotosPorMissao(c, input.eventId),
      fotosPorHora(c, input.eventId, input.fuso),
    ]),
  );

  const pack = input.packId ? (PACKS[input.packId] ?? null) : null;

  const missaoSer = missoes.map((m) => ({
    challengeId: m.challengeId,
    titulo:
      m.customTitle ??
      (pack && m.titleKey
        ? resolvePackText(pack, m.titleKey)
        : m.titleKey ?? ""),
    emoji: m.emoji,
    fotos: m.fotos,
  }));

  return { missoes: missaoSer, horas: horas.map((h) => ({ hora: String(h.hora), fotos: h.fotos })) };
}
