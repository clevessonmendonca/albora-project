import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryTtlCache } from "./memory-ttl";

describe("MemoryTtlCache", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("devolve undefined para chave ausente", () => {
    const cache = new MemoryTtlCache<string>();
    expect(cache.get("ausente")).toBeUndefined();
  });

  it("guarda e devolve o valor dentro do TTL", () => {
    const cache = new MemoryTtlCache<number>();
    cache.set("n", 7, 1_000);
    expect(cache.get("n")).toBe(7);
  });

  it("expira depois do TTL", () => {
    vi.useFakeTimers();
    const cache = new MemoryTtlCache<string>();
    cache.set("k", "vivo", 60_000);
    vi.advanceTimersByTime(60_000);
    expect(cache.get("k")).toBeUndefined();
  });

  it("ttl zero ou negativo nao grava", () => {
    const cache = new MemoryTtlCache<string>();
    cache.set("k", "x", 0);
    cache.set("k", "x", -1);
    expect(cache.get("k")).toBeUndefined();
  });

  it("chaves distintas nao se misturam", () => {
    const cache = new MemoryTtlCache<string>();
    cache.set("a", "um", 1_000);
    cache.set("b", "dois", 1_000);
    expect(cache.get("a")).toBe("um");
    expect(cache.get("b")).toBe("dois");
  });

  it("respeita o teto de entradas, descartando a mais antiga", () => {
    const cache = new MemoryTtlCache<number>(2);
    cache.set("a", 1, 10_000);
    cache.set("b", 2, 10_000);
    cache.set("c", 3, 10_000);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe(2);
    expect(cache.get("c")).toBe(3);
    expect(cache.size).toBe(2);
  });

  it("clear esvazia", () => {
    const cache = new MemoryTtlCache<string>();
    cache.set("k", "x", 1_000);
    cache.clear();
    expect(cache.get("k")).toBeUndefined();
    expect(cache.size).toBe(0);
  });
});
