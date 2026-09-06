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

// Os tetos abaixo são DERIVADOS do tamanho real de um thumb, não escolhidos
// por intuição. `THUMB_SIDE = 320` em `packages/core/src/redimensionar.ts`:
// um thumb legítimo tem no máximo 320 px no lado maior, ou seja ~0,1 MP.
//
// Uma versão anterior usava 40 MP "porque thumb não chega perto". Deixava
// passar 2,89 MP — cerca de 30x a área legítima — e o pipeline puro-JS que
// roda DEPOIS do decodificador aloca ~20 bytes por pixel além do que o
// `maxMemoryUsageInMB` do jpeg-js contabiliza (cópia RGBA, grade de
// luminância em Float64, respostas do laplaciano). Medido: um JPEG uniforme
// de 1700x1700 e 78 KiB passava pelos três limites e alocava +216 MB. O teto
// de um isolate de Cloudflare Workers é 128 MB, e o isolate morto pelo
// runtime NÃO é exceção JS — o try/catch abaixo não o captura, e a promessa
// de "degrada para sinal ausente" não valeria nesse caminho.

/** `readThumb` já corta em 512 KiB (`TETO_DA_THUMB`); acima disso não é thumb. */
const MAX_BYTES_THUMB = 512 * 1024;
/** Teto de memória do decodificador, em MB. */
const MAX_MEMORIA_DECODE_MB = 16;
/** ~0,25 MP: folga de 2,5x sobre os 0,1 MP de um thumb 320x320, e 11x abaixo do que amplificava. */
const MAX_RESOLUCAO_MP = 0.25;

export function scoresDoThumb(bytes: Uint8Array): ScoresCalculados {
  if (bytes.byteLength > MAX_BYTES_THUMB) return SCORE_AUSENTE;
  try {
    const { width, height, data } = decodeJpeg(bytes, {
      useTArray: true,
      maxMemoryUsageInMB: MAX_MEMORIA_DECODE_MB,
      maxResolutionInMP: MAX_RESOLUCAO_MP,
    });
    // Compartilha a memória em vez de copiar o RGBA inteiro — a cópia era
    // 4 bytes por pixel de amplificação sem necessidade.
    const pixels = new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
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
