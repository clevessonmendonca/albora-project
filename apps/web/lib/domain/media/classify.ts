import {
  chaveThumbDeFull,
  classificarImagem,
  provedorDeImagemDoAmbiente,
  type EntradaDeImagem,
  type VeredictoDoClassificador,
} from "@albora/core";
import {
  buscarUploadsParaClassificar,
  claimNextForModeration,
  reclaimStaleModeration,
  completeModeration,
  enqueueModeration,
  failModeration,
  listPendingClassifierUploads,
  saveUploadVerdict,
  withEvent,
  type ClaimedItem,
  type UploadParaClassificar,
} from "@albora/db";
import { getPool } from "@/lib/db";
import { readThumb } from "@/lib/r2";

/** Um lote não deveria levar tanto; além disso, presume-se processo morto. */
const RECLAIM_APOS_SEGUNDOS = 600;
const LIMIT = 8;
const MAX_ATTEMPTS = 3;

export type ClassifierDependencies = {
  /** Devolve a `pending` claims órfãos de processo morto. Roda ANTES do claim, senão o item preso nunca mais é visto. */
  reclaim: (eventId: string) => Promise<number>;
  claim: (eventId: string, limit: number) => Promise<ClaimedItem[]>;
  getUploads: (
    eventId: string,
    uploadIds: string[],
  ) => Promise<Map<string, UploadParaClassificar>>;
  readThumb: (key: string) => Promise<Uint8Array | null>;
  complete: (
    eventId: string,
    uploadId: string,
    outcome: { provider: string; result: unknown },
  ) => Promise<void>;
  fail: (
    eventId: string,
    uploadId: string,
    maxAttempts: number,
  ) => Promise<"retry" | "failed">;
  saveVerdict: (
    eventId: string,
    uploadId: string,
    verdict: VeredictoDoClassificador,
  ) => Promise<void>;
  classify: (entrada: EntradaDeImagem) => Promise<VeredictoDoClassificador>;
  provider?: string;
};

/**
 * `claimNextForModeration` (`FOR UPDATE SKIP LOCKED`) substitui o `Set` em
 * memória que existia aqui: duas instâncias chamando esta função para o
 * mesmo evento ao mesmo tempo reivindicam itens diferentes da fila, nunca o
 * mesmo — a exclusão mútua é do banco, não do processo. Por isso esta
 * função não guarda nenhum estado entre chamadas.
 *
 * Thumb ainda não propagada no storage e falha de leitura tomam o mesmo
 * caminho: `deps.fail`. Não há mais espera por tempo de relógio (o antigo
 * `THUMB_WAIT_MS`) — o item volta pra `pending` e o próximo claim (próximo
 * poll do telão, ou o job periódico) tenta de novo; só quando `attempts`
 * esgota é que a mídia é dada como `sem-resposta` de vez.
 */
export async function classifyPendingForEvent(
  eventId: string,
  deps: ClassifierDependencies,
  limit = LIMIT,
  maxAttempts = MAX_ATTEMPTS,
): Promise<number> {
  // Antes de reivindicar: devolver à fila o que ficou preso em `claimed` por
  // processo que morreu no meio do lote. Sem isso o item é órfão permanente —
  // o telão fecha nele para sempre, em silêncio.
  await deps.reclaim(eventId);

  const claimed = await deps.claim(eventId, limit);
  if (claimed.length === 0) return 0;

  const uploads = await deps.getUploads(
    eventId,
    claimed.map((item) => item.uploadId),
  );
  let processed = 0;

  for (const item of claimed) {
    const upload = uploads.get(item.uploadId);
    if (!upload) {
      // Não deveria acontecer — `photo_moderation.upload_id` referencia
      // `uploads(id) ON DELETE CASCADE`. Se ainda assim a mídia sumiu, força
      // `failed` já (attempts corrente como teto) em vez de deixar o item
      // `claimed` pra sempre, órfão de qualquer claim futuro.
      await deps.fail(eventId, item.uploadId, item.attempts);
      processed += 1;
      continue;
    }

    const thumbKey = chaveThumbDeFull(upload.chaveFull);
    let bytes: Uint8Array | null;
    try {
      bytes = await deps.readThumb(thumbKey);
    } catch {
      await falharOuEncerrar(eventId, item.uploadId, maxAttempts, deps);
      processed += 1;
      continue;
    }

    if (bytes === null) {
      await falharOuEncerrar(eventId, item.uploadId, maxAttempts, deps);
      processed += 1;
      continue;
    }

    // A thumb é sempre JPEG (client-side: `foto.thumb` na captura de imagem,
    // `posterFromVideo` na de vídeo — ver `confirm-upload.ts`, que valida a
    // thumb como "image/jpeg" independente de `upload.mime`). Vídeo não tem
    // classificador próprio (task 7): reusa este classificador de imagem
    // sobre o quadro-poster extraído no cliente, nunca sobre os bytes do
    // vídeo. `upload.mime` aqui seria "video/mp4"/"video/quicktime" e
    // rotularia a data URI errado para o provedor — por isso é sempre
    // "image/jpeg", nunca `upload.mime`.
    //
    // Invariante: um quadro não cobre um vídeo inteiro. O gate de vídeo é
    // por construção mais fraco que o de imagem estática; a compensação é a
    // denúncia (`aparece_na_foto`/`ofensivo`) e o modo endurecido do evento,
    // não uma cobertura completa do conteúdo. Vídeo sem quadro extraível
    // nunca chega aqui (confirm exige thumb, ver `uploads/confirm/route.ts`);
    // extração que falhar ou estourar o tempo cai no mesmo `sem-resposta` de
    // qualquer classificação silenciosa — nunca `"limpo"`.
    const verdict = await deps.classify({ bytes, mime: "image/jpeg" });

    if (verdict === "sem-resposta") {
      // Silêncio do provedor (timeout, 429/5xx, corpo malformado) é falha
      // retentável, não veredito definitivo — mesmo caminho de `readThumb`
      // acima. Nada de `complete` aqui: isso marcaria a fila `done` e
      // `saveVerdict` gravaria via `WHERE classifier_verdict IS NULL`,
      // irreversível. Só quando `falharOuEncerrar` esgota as tentativas é
      // que "sem-resposta" vira veredito final gravado.
      await falharOuEncerrar(eventId, item.uploadId, maxAttempts, deps);
      processed += 1;
      continue;
    }

    await deps.complete(eventId, item.uploadId, {
      provider: deps.provider ?? "desconhecido",
      result: { veredicto: verdict },
    });
    await deps.saveVerdict(eventId, item.uploadId, verdict);
    processed += 1;
  }

  return processed;
}

/** Só grava `sem-resposta` (o que libera galeria/telão) quando a tentativa realmente se esgotou. */
async function falharOuEncerrar(
  eventId: string,
  uploadId: string,
  maxAttempts: number,
  deps: ClassifierDependencies,
): Promise<void> {
  const resultado = await deps.fail(eventId, uploadId, maxAttempts);
  if (resultado === "failed") {
    await deps.saveVerdict(eventId, uploadId, "sem-resposta");
  }
}

export type OrphanEnqueueDependencies = {
  listPending: (eventId: string, limit: number) => Promise<{ id: string }[]>;
  enqueue: (eventId: string, uploadId: string) => Promise<void>;
};

/**
 * Rede de segurança do job periódico: enfileira uploads publicados sem
 * veredito que não têm (ou perderam) linha em `photo_moderation` — o caso em
 * que `enqueueModeration` falhou por completo sob o SAVEPOINT do confirm
 * (`confirm-upload.ts`) e a mídia nunca chegou a existir na fila, ficando
 * invisível para `listEventsWithPendingModeration` e para
 * `classifyPendingForEvent`. `enqueue` é idempotente (`ON CONFLICT DO
 * NOTHING` na PK `upload_id`), então reenfileirar um item que já está na
 * fila não tem efeito.
 */
export async function enqueueOrphanedUploads(
  eventId: string,
  deps: OrphanEnqueueDependencies,
  limit = LIMIT,
): Promise<number> {
  const uploads = await deps.listPending(eventId, limit);
  for (const upload of uploads) {
    await deps.enqueue(eventId, upload.id);
  }
  return uploads.length;
}

export async function enqueueOrphanedUploadsForEventNow(
  eventId: string,
  limit = LIMIT,
): Promise<number> {
  return enqueueOrphanedUploads(eventId, productionOrphanDependencies(), limit);
}

function productionOrphanDependencies(): OrphanEnqueueDependencies {
  const pool = getPool();
  return {
    listPending: (eventId, limit) =>
      withEvent(pool, eventId, (c) => listPendingClassifierUploads(c, eventId, limit)),
    enqueue: (eventId, uploadId) =>
      withEvent(pool, eventId, (c) => enqueueModeration(c, { uploadId, eventId })),
  };
}

/** Roda uma leva de verdade (aguarda o resultado) — usado pelo disparo do confirm, pelo reforço do telão e pelo job periódico. */
export async function classifyPendingForEventNow(
  eventId: string,
  limit = LIMIT,
): Promise<number> {
  return classifyPendingForEvent(eventId, productionDependencies(), limit);
}

/** Fogo e esquece — nunca deve bloquear quem chamou (poll do telão, confirm do upload). */
export function classifyMediaAfter(eventoId: string): void {
  void classifyPendingForEventNow(eventoId).catch(() => {
    console.warn("midia.classificador_falhou", { eventoId });
  });
}

function productionDependencies(): ClassifierDependencies {
  const pool = getPool();
  const provider = provedorDeImagemDoAmbiente();
  const providerName = (process.env.CLASSIFICADOR_IMAGEM_PROVEDOR ?? "heuristico").trim();

  return {
    reclaim: (eventId) =>
      withEvent(pool, eventId, (c) =>
        reclaimStaleModeration(c, eventId, RECLAIM_APOS_SEGUNDOS),
      ),
    claim: (eventId, limit) =>
      withEvent(pool, eventId, (c) => claimNextForModeration(c, eventId, limit)),
    getUploads: (eventId, uploadIds) =>
      withEvent(pool, eventId, (c) => buscarUploadsParaClassificar(c, eventId, uploadIds)),
    readThumb,
    complete: (eventId, uploadId, outcome) =>
      withEvent(pool, eventId, (c) => completeModeration(c, uploadId, outcome)),
    fail: (eventId, uploadId, maxAttempts) =>
      withEvent(pool, eventId, (c) => failModeration(c, uploadId, maxAttempts)),
    saveVerdict: (eventId, uploadId, verdict) =>
      withEvent(pool, eventId, (c) => saveUploadVerdict(c, uploadId, verdict)).then(
        () => undefined,
      ),
    classify: (entrada) => classificarImagem(entrada, provider),
    provider: providerName,
  };
}
