import { chaveThumbDeFull } from "@albora/core";
import { exposureScore, perceptualHash, sharpnessScore } from "@albora/curation";
import {
  listUploadsAwaitingCurationScore,
  saveCurationScores,
  withEvent,
  type UploadAguardandoScore,
} from "@albora/db";
import { decode as decodeJpeg } from "jpeg-js";
import { getPool } from "@/lib/db";
import { readThumb } from "@/lib/r2";

const LIMIT = 8;

export type ScoresCalculados = {
  perceptualHash: string | null;
  sharpness: number | null;
  exposure: number | null;
};

const SCORE_AUSENTE: ScoresCalculados = {
  perceptualHash: null,
  sharpness: null,
  exposure: null,
};

/**
 * Bytes de thumb decodificados em pixels RGBA e passados aos três sinais puros de
 * `@albora/curation`. Nunca lança: qualquer falha vira sinal ausente, nunca sinal ruim —
 * a mídia continua no editor do livro como qualquer outra, mesma assimetria do
 * classificador de moderação (erro vira `sem-resposta`, nunca `limpo`).
 *
 * 🔴 Os bytes NÃO são confiáveis, apesar de o thumb ser gerado no cliente via
 * `canvas.toBlob("image/jpeg")`. O convidado faz PUT direto na URL presigned, então a
 * chave do thumb aceita qualquer conteúdo. Decodificar entrada hostil no servidor é
 * bomba de descompressão: um JPEG de poucos KB pode declarar dimensões enormes e
 * estourar memória e CPU do Worker, que tem teto por request. Por isso os três limites
 * abaixo — o tamanho de entrada, e os dois tetos que o próprio `jpeg-js` expõe.
 */

/** Thumb real fica na casa das dezenas de KB; 2 MB é folga larga e ainda barra bomba. */
const MAX_BYTES_THUMB = 2 * 1024 * 1024;
/** Teto de memória do decodificador, em MB. */
const MAX_MEMORIA_DECODE_MB = 64;
/** Teto de resolução, em megapixels. Thumb legítimo não chega perto. */
const MAX_RESOLUCAO_MP = 40;

export function scoresDoThumb(bytes: Uint8Array): ScoresCalculados {
  if (bytes.byteLength > MAX_BYTES_THUMB) return SCORE_AUSENTE;
  try {
    const { width, height, data } = decodeJpeg(bytes, {
      useTArray: true,
      maxMemoryUsageInMB: MAX_MEMORIA_DECODE_MB,
      maxResolutionInMP: MAX_RESOLUCAO_MP,
    });
    const pixels = new Uint8ClampedArray(data);
    return {
      perceptualHash: perceptualHash(pixels, width, height),
      sharpness: sharpnessScore(pixels, width, height),
      exposure: exposureScore(pixels, width, height),
    };
  } catch {
    return SCORE_AUSENTE;
  }
}

export type CurationDependencies = {
  listPending: (eventId: string, limit: number) => Promise<UploadAguardandoScore[]>;
  readThumb: (key: string) => Promise<Uint8Array | null>;
  computeScores: (bytes: Uint8Array) => ScoresCalculados;
  save: (
    eventId: string,
    entry: { uploadId: string } & ScoresCalculados,
  ) => Promise<void>;
};

/**
 * Uma rodada: até `limit` mídias publicadas do evento ainda sem score.
 * Item que falha (thumb ausente, decodificação quebrada) nunca derruba o lote — grava
 * score ausente e segue para o próximo. Devolve quantas mídias foram tratadas nesta rodada
 * (sucesso ou degradado), para o chamador decidir se há mais rodada.
 */
export async function curatePendingForEvent(
  eventId: string,
  deps: CurationDependencies,
  limit = LIMIT,
): Promise<number> {
  const pendentes = await deps.listPending(eventId, limit);

  for (const midia of pendentes) {
    const scores = await calcularComDegradacao(midia.chaveFull, deps);
    await deps.save(eventId, { uploadId: midia.uploadId, ...scores });
  }

  return pendentes.length;
}

async function calcularComDegradacao(
  chaveFull: string,
  deps: CurationDependencies,
): Promise<ScoresCalculados> {
  try {
    const bytes = await deps.readThumb(chaveThumbDeFull(chaveFull));
    if (!bytes) return SCORE_AUSENTE;
    return deps.computeScores(bytes);
  } catch {
    return SCORE_AUSENTE;
  }
}

function productionDependencies(): CurationDependencies {
  const pool = getPool();
  return {
    listPending: (eventId, limit) =>
      withEvent(pool, eventId, (c) => listUploadsAwaitingCurationScore(c, eventId, limit)),
    readThumb,
    computeScores: scoresDoThumb,
    save: (eventId, entry) =>
      withEvent(pool, eventId, (c) => saveCurationScores(c, { eventId, ...entry })),
  };
}

/** Roda uma leva de verdade (aguarda o resultado) — usado pelo job periódico `/api/ops/curadoria`. */
export async function curatePendingForEventNow(eventId: string, limit = LIMIT): Promise<number> {
  return curatePendingForEvent(eventId, productionDependencies(), limit);
}
