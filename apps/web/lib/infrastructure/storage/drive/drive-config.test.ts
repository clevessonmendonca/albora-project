import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** `driveConfig()` é lazy: chaves chegam depois do boot; falta de env → `ConfigError` no primeiro uso da rota, nunca default inseguro, nunca em `config()` global. */
const VARS = [
  "DRIVE_OAUTH_CLIENT_ID",
  "DRIVE_OAUTH_CLIENT_SECRET",
  "DRIVE_OAUTH_STATE_SECRET",
  "DRIVE_TOKEN_ENC_KEY",
] as const;

const originais = Object.fromEntries(VARS.map((v) => [v, process.env[v]]));

describe("driveConfig", () => {
  beforeEach(() => {
    vi.resetModules();
    for (const v of VARS) delete process.env[v];
  });

  afterEach(() => {
    for (const v of VARS) {
      if (originais[v] === undefined) delete process.env[v];
      else process.env[v] = originais[v];
    }
  });

  it("falha alto (ConfigError) quando as quatro envs estão ausentes", async () => {
    const { driveConfig } = await import("./drive-config");
    const { ConfigError } = await import("../../config/app-config");

    let erro: unknown;
    try {
      driveConfig();
    } catch (e) {
      erro = e;
    }

    expect(erro).toBeInstanceOf(ConfigError);
    expect((erro as InstanceType<typeof ConfigError>).missing).toEqual(VARS.slice());
  });

  it("falha alto quando só uma env falta — reporta exatamente a que falta", async () => {
    process.env.DRIVE_OAUTH_CLIENT_ID = "client-id";
    process.env.DRIVE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.DRIVE_OAUTH_STATE_SECRET = "s".repeat(32);
    // DRIVE_TOKEN_ENC_KEY ausente de propósito

    const { driveConfig } = await import("./drive-config");
    const { ConfigError } = await import("../../config/app-config");
    let erro: unknown;
    try {
      driveConfig();
    } catch (e) {
      erro = e;
    }
    expect(erro).toBeInstanceOf(ConfigError);
    expect((erro as InstanceType<typeof ConfigError>).missing).toEqual(["DRIVE_TOKEN_ENC_KEY"]);
  });

  it("DRIVE_OAUTH_STATE_SECRET curto demais falha alto, nunca um segredo fraco", async () => {
    process.env.DRIVE_OAUTH_CLIENT_ID = "client-id";
    process.env.DRIVE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.DRIVE_OAUTH_STATE_SECRET = "curto";
    process.env.DRIVE_TOKEN_ENC_KEY = Buffer.alloc(32, 1).toString("base64");

    const { driveConfig } = await import("./drive-config");
    const { ConfigError } = await import("../../config/app-config");
    expect(() => driveConfig()).toThrow(ConfigError);
  });

  it("DRIVE_TOKEN_ENC_KEY que não decodifica para 32 bytes falha alto", async () => {
    process.env.DRIVE_OAUTH_CLIENT_ID = "client-id";
    process.env.DRIVE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.DRIVE_OAUTH_STATE_SECRET = "s".repeat(32);
    process.env.DRIVE_TOKEN_ENC_KEY = Buffer.alloc(16, 1).toString("base64");

    const { driveConfig } = await import("./drive-config");
    const { ConfigError } = await import("../../config/app-config");
    expect(() => driveConfig()).toThrow(ConfigError);
  });

  it("com as quatro envs válidas, devolve config memoizada e a chave decodificada tem 32 bytes", async () => {
    process.env.DRIVE_OAUTH_CLIENT_ID = "client-id";
    process.env.DRIVE_OAUTH_CLIENT_SECRET = "client-secret";
    process.env.DRIVE_OAUTH_STATE_SECRET = "s".repeat(32);
    process.env.DRIVE_TOKEN_ENC_KEY = Buffer.alloc(32, 9).toString("base64");

    const { driveConfig } = await import("./drive-config");
    const c1 = driveConfig();
    const c2 = driveConfig();
    expect(c1).toBe(c2);
    expect(c1.tokenEncKey).toHaveLength(32);
  });

  it("nunca cai de volta em SESSION_SECRET nem em nenhum outro segredo do produto", async () => {
    process.env.SESSION_SECRET = "s".repeat(40);
    process.env.DRIVE_OAUTH_CLIENT_ID = "client-id";
    process.env.DRIVE_OAUTH_CLIENT_SECRET = "client-secret";
    // DRIVE_OAUTH_STATE_SECRET ausente — não deve pegar SESSION_SECRET emprestado
    process.env.DRIVE_TOKEN_ENC_KEY = Buffer.alloc(32, 1).toString("base64");

    const { driveConfig } = await import("./drive-config");
    const { ConfigError } = await import("../../config/app-config");
    expect(() => driveConfig()).toThrow(ConfigError);
  });
});
