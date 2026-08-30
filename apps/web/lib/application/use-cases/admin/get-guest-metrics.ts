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
import {
  decideThesis,
  denominadorDaParticipacao,
  lerIntencao,
  type CodigoDaTese,
  type LeituraDeIntencao,
  type OrigemDoDenominador,
} from "@albora/core";
import type { Pool } from "pg";
import { assinarGet } from "@/lib/r2";

const GET_TTL_SECONDS = 900;

export type GuestMetricsInput = {
  eventId: string;
  expectedGuests: number;
  /** Presença confirmada após a festa. Ausente = ainda vale a estimativa. */
  actualGuests?: number | null | undefined;
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
  /** O número efetivamente usado como denominador. */
  denominador: number;
  origemDoDenominador: OrigemDoDenominador;
  totalSessoes: number;
  sessoesComUpload: number;
  totalFotos: number;
  sharesTotais: number;
  participacao: number;
  veredito: CodigoDaTese;
  /** Quem quis e não conseguiu — separa falha de rede de falta de participação. */
  intencao: LeituraDeIntencao;
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

  // Presença confirmada ganha da estimativa: a diferença entre convidado e
  // presente é grande o bastante para mover o veredito de faixa.
  const denominador = denominadorDaParticipacao({
    expectedGuests: input.expectedGuests,
    actualGuests: input.actualGuests,
  });

  const veredito = decideThesis({
    expectedGuests: denominador.valor,
    sessoesComUpload: data.metricas.sessoesComUpload,
  });

  // `degraus` já conta por etapa mais avançada alcançada — `capture` é a fronteira
  // entre "não quis" e "quis e não conseguiu".
  const capturaram =
    data.funil.degraus.find((d) => d.etapa === "capture")?.sessoes ??
    data.metricas.sessoesComUpload;

  const intencao = lerIntencao({
    expectedGuests: denominador.valor,
    sessoesComUpload: data.metricas.sessoesComUpload,
    sessoesComCaptura: Math.max(capturaram, data.metricas.sessoesComUpload),
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
    denominador: denominador.valor,
    origemDoDenominador: denominador.origem,
    totalSessoes: data.funil.totalSessoes,
    sessoesComUpload: data.metricas.sessoesComUpload,
    totalFotos: data.metricas.totalFotos,
    sharesTotais: data.metricas.sharesTotais,
    participacao: veredito.taxa,
    veredito: veredito.codigo as CodigoDaTese,
    intencao,
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
