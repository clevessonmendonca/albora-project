import type { Queue, QueueDetails, QueueItem } from "@albora/core";
import { MAX_ATTEMPTS } from "@albora/core";

const INDEX = "index.json";

export type JsonStore = {
  read(path: string): Promise<string | null>;
  write(path: string, contents: string): Promise<void>;
  remove(path: string): Promise<void>;
};

function join(root: string, name: string): string {
  return `${root.replace(/\/$/, "")}/${name}`;
}

/** Fila em arquivos. O iOS `URLSession` em segundo plano só continua se o corpo estiver em disco (ADR 0008/0010). IndexedDB não serve aqui. */
export function createFileQueue(store: JsonStore, root: string): Queue {
  async function load(): Promise<QueueItem[]> {
    const raw = await store.read(join(root, INDEX));
    if (raw === null) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as QueueItem[]) : [];
    } catch {
      return [];
    }
  }

  async function save(items: QueueItem[]): Promise<void> {
    await store.write(join(root, INDEX), JSON.stringify(items));
  }

  return {
    async enqueue(item) {
      const items = await load();
      await save([...items.filter((row) => row.id !== item.id), item]);
    },
    async list() {
      return load();
    },
    async remove(id) {
      const items = await load();
      await save(items.filter((row) => row.id !== id));
    },
    async markAttempt(id) {
      const items = await load();
      await save(
        items.map((row) =>
          row.id === id ? { ...row, tentativas: Math.min(row.tentativas + 1, MAX_ATTEMPTS) } : row,
        ),
      );
    },
    async annotate(id, details: QueueDetails) {
      const items = await load();
      const found = items.some((row) => row.id === id);
      if (!found) return false;
      await save(items.map((row) => (row.id === id ? { ...row, ...details } : row)));
      return true;
    },
  };
}

export function memoryStore(): JsonStore {
  const files = new Map<string, string>();
  return {
    async read(path) {
      return files.get(path) ?? null;
    },
    async write(path, contents) {
      files.set(path, contents);
    },
    async remove(path) {
      files.delete(path);
    },
  };
}
