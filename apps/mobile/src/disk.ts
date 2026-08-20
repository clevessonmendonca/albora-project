import type { Queue } from "@albora/core";
import {
  EncodingType,
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readAsStringAsync,
  writeAsStringAsync,
} from "expo-file-system";
import type { FileOps } from "./files";
import { createFileQueue, type JsonStore } from "./queue";

function requireDoc(): string {
  if (!documentDirectory) throw new Error("sem diretório de documentos");
  return documentDirectory;
}

export function queueRoot(): string {
  return `${requireDoc()}fila`;
}

export function mediaRoot(): string {
  return `${queueRoot()}/arquivos`;
}

function parentDir(path: string): string {
  return path.slice(0, path.lastIndexOf("/"));
}

export function diskStore(): JsonStore {
  return {
    async read(path) {
      const info = await getInfoAsync(path);
      if (!info.exists) return null;
      return readAsStringAsync(path);
    },
    async write(path, contents) {
      await makeDirectoryAsync(parentDir(path), { intermediates: true });
      await writeAsStringAsync(path, contents);
    },
    async remove(path) {
      await deleteAsync(path, { idempotent: true });
    },
  };
}

export function diskFiles(): FileOps {
  return {
    async copy(from, to) {
      await makeDirectoryAsync(parentDir(to), { intermediates: true });
      await copyAsync({ from, to });
    },
    async info(path) {
      const info = await getInfoAsync(path);
      if (!info.exists || info.isDirectory) return { exists: false, size: 0 };
      return { exists: true, size: info.size };
    },
    async readHead(path, bytes) {
      const b64 = await readAsStringAsync(path, {
        encoding: EncodingType.Base64,
        position: 0,
        length: bytes,
      });
      return decodeBase64(b64);
    },
    async readAll(path) {
      const b64 = await readAsStringAsync(path, { encoding: EncodingType.Base64 });
      return decodeBase64(b64);
    },
    async write(path, bytes) {
      await makeDirectoryAsync(parentDir(path), { intermediates: true });
      await writeAsStringAsync(path, encodeBase64(bytes), { encoding: EncodingType.Base64 });
    },
    async mkdir(path) {
      await makeDirectoryAsync(path, { intermediates: true });
    },
    async remove(path) {
      await deleteAsync(path, { idempotent: true });
    },
  };
}

let queue: Queue | undefined;

export function guestQueue(): Queue {
  queue ??= createFileQueue(diskStore(), queueRoot());
  return queue;
}

function decodeBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) {
    out[i] = bin.charCodeAt(i);
  }
  return out;
}

function encodeBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) {
    bin += String.fromCharCode(bytes[i]!);
  }
  return btoa(bin);
}
