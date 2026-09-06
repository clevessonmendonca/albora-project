import type pg from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { resetRateLimit } from "../staff/rate-limit";
import { startGoogleLogin } from "./start-google-login";

let admin: pg.Pool;
let app: pg.Pool;
const SEGREDO = "segredo-de-teste-com-pelo-menos-32-caracteres-ok";

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

afterEach(() => resetRateLimit());

describe("startGoogleLogin", () => {
  it("emite state para uma superfície válida", async () => {
    await prepararBanco();
    const resultado = await startGoogleLogin(app, SEGREDO, {
      surface: "host",
      returnTo: "/admin/eventos",
      ipHash: "hash-ip-1",
    });
    expect(resultado).toHaveProperty("state");
    expect(resultado).toHaveProperty("nonce");
  });

  it("estoura rate limit por IP após muitas tentativas e grava security_events", async () => {
    await prepararBanco();
    for (let i = 0; i < 10; i++) {
      await startGoogleLogin(app, SEGREDO, { surface: "staff", ipHash: "hash-ip-estourado" });
    }
    const resultado = await startGoogleLogin(app, SEGREDO, { surface: "staff", ipHash: "hash-ip-estourado" });
    expect(resultado).toEqual({ rateLimited: true });

    const { rows } = await admin.query(
      "SELECT kind FROM security_events WHERE kind = 'rate_limit.exceeded' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.kind).toBe("rate_limit.exceeded");
  });
});
