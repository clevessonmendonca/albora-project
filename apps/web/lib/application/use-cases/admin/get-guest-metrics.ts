/**
 * Use Case: Get Guest Metrics
 *
 * Carrega métricas de participação e funil agregado do evento.
 */
import {
  withEvent,
  lerFunilAgregado,
  lerMetricasAoVivo,
  listarSessoesDoHost,
} from "@albora/db";
import { decideThesis, type CodigoDaTese } from "@albora/core";
import type { Pool } from "pg";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

export type GuestMetricsInput = {
  eventId: string;
  expectedGuests: number;
};

export type SessionSummary = {
  id: string;
  nome: string;
  fotos: number;
};

export type RecentPhoto = {
  id: string;
  criadaEm: string;
  thumb: string;
};

export type GuestMetricsOutput = {
  expectedGuests: number;
  totalSessoes: number;
  sessoesComUpload: number;
  totalFotos: number;
  sharesTotais: number;
  participacao: number;
  veredito: CodigoDaTese;
  degraus: Awaited<ReturnType<typeof lerFunilAgregado>>["degraus"];
  uploadsAntesDoFeed: number;
  uploadsDepoisDoFeed: number;
  entradasPorVia: Awaited<ReturnType<typeof lerFunilAgregado>>["entradasPorVia"];
  ultimas: RecentPhoto[];
  sessoes: SessionSummary[];
};

export async function getGuestMetrics(
  input: GuestMetricsInput,
  pool: Pool,
): Promise<GuestMetricsOutput> {
  const data = await withEvent(pool, input.eventId, async (c) => {
    const [metricas, funil, sessoes] = await Promise.all([
      lerMetricasAoVivo(c, input.eventId),
      lerFunilAgregado(c, input.eventId),
      listarSessoesDoHost(c, input.eventId),
    ]);
    return { metricas, funil, sessoes };
  });

  const veredito = decideThesis({
    expectedGuests: input.expectedGuests,
    sessoesComUpload: data.metricas.sessoesComUpload,
  });

  const ultimas = await Promise.all(
    data.metricas.ultimas.map(async (f) => ({
      id: f.id,
      criadaEm: f.criadaEm.toISOString(),
      thumb: await assinarGet(f.chaveThumb, GET_TTL_SECONDS),
    })),
  );

  return {
    expectedGuests: input.expectedGuests,
    totalSessoes: data.funil.totalSessoes,
    sessoesComUpload: data.metricas.sessoesComUpload,
    totalFotos: data.metricas.totalFotos,
    sharesTotais: data.metricas.sharesTotais,
    participacao: veredito.taxa,
    veredito: veredito.codigo as CodigoDaTese,
    degraus: data.funil.degraus,
    uploadsAntesDoFeed: data.funil.uploadsAntesDoFeed,
    uploadsDepoisDoFeed: data.funil.uploadsDepoisDoFeed,
    entradasPorVia: data.funil.entradasPorVia,
    ultimas,
    sessoes: data.sessoes.map((s) => ({
      id: s.id,
      nome: s.nome,
      fotos: s.fotos,
    })),
  };
}
