import type { Queue } from "@albora/core";

/**
 * TODO(mobile): drenar com URLSession (iOS) / WorkManager (Android).
 * O item já está em arquivo; Blob/IndexedDB não servem (ADR 0008/0010).
 *
 * TODO(mobile): LUT e remoção de EXIF (`processarFoto`) antes do PUT.
 * Sem reencode a coordenada de GPS sairia no objeto — e isso é LGPD.
 */
export async function drainFileQueue(_queue: Queue): Promise<void> {
  return;
}
