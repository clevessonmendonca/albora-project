import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * `getAggregatorPool` é o bloqueador que a V1 do canal do fornecedor
 * sinalizou: sem `DATABASE_URL_AGGREGATOR`, nada pode cair de volta em
 * `getPool()` — a política `vendor_membro`/`isolamento_evento` continuaria
 * de pé, mas sob o papel comum a leitura cross-vendor simplesmente
 * devolveria zero linhas, silenciosamente. Falhar alto aqui é a diferença
 * entre um deploy que quebra no boot do primeiro request e um "meus
 * eventos" vazio para todo fornecedor.
 */
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
    // `ConfigError` importado do módulo fresco (pós `resetModules`), não do
    // topo do arquivo: o topo carregaria uma segunda instância de "./config",
    // e `instanceof` contra a classe errada falharia mesmo com o erro certo.
    const { getAggregatorPool } = await import("./db");
    const { ConfigError } = await import("./config");

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
    const { getAggregatorPool } = await import("./db");

    const primeira = getAggregatorPool();
    const segunda = getAggregatorPool();
    expect(primeira).toBe(segunda);

    await primeira.end();
  });
});
