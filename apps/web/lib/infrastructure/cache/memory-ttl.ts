type Entry<T> = { value: T; expiresAt: number };

export class MemoryTtlCache<T> {
  private readonly store = new Map<string, Entry<T>>();

  constructor(private readonly maxEntries = 500) {}

  get size(): number {
    return this.store.size;
  }

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (now >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlMs: number, now = Date.now()): void {
    if (ttlMs <= 0) return;
    this.store.set(key, { value, expiresAt: now + ttlMs });
    this.prune(now);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  private prune(now: number): void {
    for (const [key, entry] of this.store) {
      if (now >= entry.expiresAt) this.store.delete(key);
    }
    while (this.store.size > this.maxEntries) {
      const oldest = this.store.keys().next().value;
      if (oldest === undefined) break;
      this.store.delete(oldest);
    }
  }
}
