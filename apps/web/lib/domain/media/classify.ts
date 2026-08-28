import {
  chaveThumbDeFull,
  classificarImagem,
  provedorDeImagemDoAmbiente,
  type EntradaDeImagem,
  type VeredictoDoClassificador,
} from "@albora/core";
import {
  listPendingClassifierUploads,
  saveUploadVerdict,
  withEvent,
  type UploadPendenteDeClassificacao,
} from "@albora/db";
import { getPool } from "@/lib/db";
import { readThumb } from "@/lib/r2";

const LIMIT = 8;
const THUMB_WAIT_MS = 30_000;

const inFlight = new Set<string>();

export type ClassifierDependencies = {
  list: (eventId: string) => Promise<UploadPendenteDeClassificacao[]>;
  readThumb: (key: string) => Promise<Uint8Array | null>;
  save: (
    eventId: string,
    uploadId: string,
    verdict: VeredictoDoClassificador,
  ) => Promise<void>;
  classify: (entrada: EntradaDeImagem) => Promise<VeredictoDoClassificador>;
  now?: () => number;
};

export async function classifyPendingForEvent(
  eventId: string,
  deps: ClassifierDependencies,
  limit = LIMIT,
): Promise<number> {
  const pending = (await deps.list(eventId)).slice(0, limit);
  const now = deps.now ?? Date.now;
  let processed = 0;

  for (const p of pending) {
    const thumbKey = chaveThumbDeFull(p.chaveFull);
    let bytes: Uint8Array | null;
    try {
      bytes = await deps.readThumb(thumbKey);
    } catch {
      await deps.save(eventId, p.id, "sem-resposta");
      processed += 1;
      continue;
    }

    if (bytes === null) {
      if (now() - p.criadaEm.getTime() >= THUMB_WAIT_MS) {
        await deps.save(eventId, p.id, "sem-resposta");
        processed += 1;
      }
      continue;
    }

    const verdict = await deps.classify({ bytes, mime: p.mime });
    await deps.save(eventId, p.id, verdict);
    processed += 1;
  }

  return processed;
}

export function classifyMediaAfter(eventoId: string): void {
  if (inFlight.has(eventoId)) return;
  inFlight.add(eventoId);
  void classifyPendingForEvent(eventoId, productionDependencies())
    .catch(() => {
      console.warn("midia.classificador_falhou", { eventoId });
    })
    .finally(() => {
      inFlight.delete(eventoId);
    });
}

function productionDependencies(): ClassifierDependencies {
  const pool = getPool();
  const provider = provedorDeImagemDoAmbiente();
  return {
    list: (eventId) =>
      withEvent(pool, eventId, (c) => listPendingClassifierUploads(c, eventId)),
    readThumb,
    save: (eventId, uploadId, verdict) =>
      withEvent(pool, eventId, (c) => saveUploadVerdict(c, uploadId, verdict)).then(
        () => undefined,
      ),
    classify: (entrada) => classificarImagem(entrada, provider),
  };
}
