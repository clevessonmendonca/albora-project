import type { DrainSummary, Queue } from "@albora/core";
import { diskFiles } from "./disk";
import { loadSession } from "./feed";
import { putFileFromDisk } from "./put-file";
import { drainFileQueue as drainWithSession } from "./upload";

/**
 * Wiring Expo: sessão no SecureStore + bytes no FileSystem.
 * A lógica testável mora em `upload.ts` (sem imports nativos).
 */
export async function drainGuestQueue(queue: Queue): Promise<DrainSummary> {
  const session = await loadSession();
  const files = diskFiles();
  return drainWithSession(queue, {
    session,
    readBytes: (path) => files.readAll(path),
    removeFile: (path) => files.remove(path),
    putFile: putFileFromDisk,
  });
}
