export type FileOps = {
  copy(from: string, to: string): Promise<void>;
  info(path: string): Promise<{ exists: boolean; size: number }>;
  readHead(path: string, bytes: number): Promise<Uint8Array>;
  readAll(path: string): Promise<Uint8Array>;
  /** Grava bytes crus (JPEG processado). */
  write?(path: string, bytes: Uint8Array): Promise<void>;
  mkdir(path: string): Promise<void>;
  remove(path: string): Promise<void>;
};

export function memoryFiles(seed: Record<string, Uint8Array> = {}): FileOps & {
  files: Map<string, Uint8Array>;
} {
  const files = new Map<string, Uint8Array>(Object.entries(seed));
  return {
    files,
    async copy(from, to) {
      const data = files.get(from);
      if (!data) throw new Error("origem ausente");
      files.set(to, new Uint8Array(data));
    },
    async info(path) {
      const data = files.get(path);
      return data ? { exists: true, size: data.byteLength } : { exists: false, size: 0 };
    },
    async readHead(path, bytes) {
      const data = files.get(path);
      if (!data) throw new Error("arquivo ausente");
      return data.slice(0, bytes);
    },
    async readAll(path) {
      const data = files.get(path);
      if (!data) throw new Error("arquivo ausente");
      return new Uint8Array(data);
    },
    async write(path, bytes) {
      files.set(path, new Uint8Array(bytes));
    },
    async mkdir() {},
    async remove(path) {
      files.delete(path);
    },
  };
}
