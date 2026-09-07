import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** `getAggregatorPool` sem `DATABASE_URL_AGGREGATOR` NÃO pode cair em `getPool()` — leitura cross-vendor devolveria zero linhas silenciosamente em vez de quebrar no boot. */
describe("getAggregatorPool", () => {
  const VAR = "DATABASE_URL_AGGREGATOR";
  const original = process.env[VAR];

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (original === undefined) delete process.env[VAR];
    else process.env[VAR] = original;
  });

  it("falha alto (ConfigError) quando a env está ausente — nunca um default inseguro", async () => {
    delete process.env[VAR];
    // `ConfigError` importado do módulo fresco (pós `resetModules`) — o topo carregaria outra instância de "./config", e `instanceof` falharia mesmo com o erro certo.
    const { getAggregatorPool } = await import("./client");
    const { ConfigError } = await import("../../config");

    let erro: unknown;
    try {
      getAggregatorPool();
    } catch (e) {
      erro = e;
    }

    expect(erro).toBeInstanceOf(ConfigError);
    expect((erro as InstanceType<typeof ConfigError>).missing).toEqual(["DATABASE_URL_AGGREGATOR"]);
  });

  it("devolve uma pool própria e memoizada quando a env existe", async () => {
    process.env[VAR] = "postgres://albora_agregador:senha@localhost:55432/albora";
    const { getAggregatorPool } = await import("./client");

    const primeira = getAggregatorPool();
    const segunda = getAggregatorPool();
    expect(primeira).toBe(segunda);

    await primeira.end();
  });
});
