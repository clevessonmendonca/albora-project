import type { DrainSummary, Queue } from "@albora/core";
import * as FileSystem from "expo-file-system";
import {
  persistDrainTelemetry,
  readPersistedDrainTelemetry,
  telemetryFromSummary,
  type DrainTelemetry,
  type OrigemDrain,
} from "./drain-telemetry";
import { diskFiles } from "./disk";
import { loadSession } from "./feed";
import { putFileFromDisk } from "./put-file";
import { estaOnline } from "./online";
import { drainFileQueue as drainWithSession } from "./upload";

const TELEMETRY_FILE = "albora-drain-telemetry.json";

function telemetryPath(name: string): string {
  return `${FileSystem.cacheDirectory ?? ""}${name}`;
}

async function readTelemetryFile(path: string): Promise<string | null> {
  try {
    return await FileSystem.readAsStringAsync(telemetryPath(path));
  } catch {
    return null;
  }
}

async function writeTelemetryFile(path: string, json: string): Promise<void> {
  await FileSystem.writeAsStringAsync(telemetryPath(path), json);
}

export async function readDrainTelemetry(): Promise<DrainTelemetry | null> {
  return readPersistedDrainTelemetry(readTelemetryFile, TELEMETRY_FILE);
}

/**
 * Wiring Expo: sessão no SecureStore + bytes no FileSystem.
 * A lógica testável mora em `upload.ts` (sem imports nativos).
 */
export async function drainGuestQueue(
  queue: Queue,
  origem: OrigemDrain = "manual",
): Promise<DrainSummary> {
  const session = await loadSession();
  const files = diskFiles();
  const online = await estaOnline();
  const summary = await drainWithSession(queue, {
    session,
    readBytes: (path) => files.readAll(path),
    removeFile: (path) => files.remove(path),
    putFile: putFileFromDisk,
    online: () => online,
  });

  await persistDrainTelemetry(telemetryFromSummary(summary, origem), writeTelemetryFile, TELEMETRY_FILE);
  return summary;
}
