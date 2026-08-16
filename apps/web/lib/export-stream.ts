import { midiaExportavel, nomeNoZip, zipStore, type ZipStoreEntry } from "@albora/core";
import type { ItemDoExport } from "@albora/db";

export async function* zipEntriesFromJob(
  eventoId: string,
  itens: readonly ItemDoExport[],
  ler: (chave: string) => Promise<ReadableStream<Uint8Array> | null>,
): AsyncIterable<ZipStoreEntry> {
  let indice = 0;
  for (const item of itens) {
    if (!midiaExportavel({ id: item.id, chave: item.chave, mime: item.mime, estado: "published" }, eventoId)) {
      continue;
    }

    const body = await ler(item.chave).catch(() => null);
    if (!body) continue;

    const nome = nomeNoZip(indice, item.mime);
    indice += 1;
    yield { nome, dados: streamChunks(body) };
  }
}

export function readableZip(chunks: AsyncIterable<Uint8Array>): ReadableStream<Uint8Array> {
  const iterator = chunks[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await iterator.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel() {
      await iterator.return?.();
    },
  });
}

export function acervoZipStream(
  eventoId: string,
  itens: readonly ItemDoExport[],
  ler: (chave: string) => Promise<ReadableStream<Uint8Array> | null>,
): ReadableStream<Uint8Array> {
  return readableZip(zipStore(zipEntriesFromJob(eventoId, itens, ler)));
}

async function* streamChunks(body: ReadableStream<Uint8Array>): AsyncIterable<Uint8Array> {
  const reader = body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      if (value) yield value;
    }
  } finally {
    reader.releaseLock();
  }
}
