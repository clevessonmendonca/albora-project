import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const opcoes: Record<string, unknown>[] = [];

vi.mock("pg", () => ({
  default: {
    Pool: class {
      constructor(o: Record<string, unknown>) {
        opcoes.push(o);
      }
    },
  },
}));
vi.mock("../../config", () => ({
  config: () => ({ databaseUrl: "postgres://app@exemplo.test/db" }),
  ConfigError: class extends Error {},
}));

describe("pools do banco", () => {
  beforeEach(() => {
    opcoes.length = 0;
    vi.resetModules();
    vi.stubEnv("DATABASE_URL_AGGREGATOR", "postgres://agg@exemplo.test/db");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("no Worker cada conexão vale uma vez só, nos dois pools", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    const { getPool, getAggregatorPool } = await import("./client");

    getPool();
    getAggregatorPool();

    expect(opcoes).toHaveLength(2);
    expect(opcoes.every((o) => o.maxUses === 1)).toBe(true);
  });

  it("fora do Worker as conexões seguem reaproveitadas", async () => {
    vi.stubGlobal("navigator", { userAgent: "Node.js/22" });
    const { getPool } = await import("./client");

    getPool();

    expect(opcoes).toHaveLength(1);
    expect(opcoes[0]).not.toHaveProperty("maxUses");
  });

  it("o pool continua sendo um só por instância", async () => {
    vi.stubGlobal("navigator", { userAgent: "Cloudflare-Workers" });
    const { getPool } = await import("./client");

    expect(getPool()).toBe(getPool());
    expect(opcoes).toHaveLength(1);
  });
});
