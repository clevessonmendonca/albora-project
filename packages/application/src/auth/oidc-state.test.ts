import { createHash } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { consumeOidcState, InvalidOidcStateError, issueOidcState, sanitizeReturnTo } from "./oidc-state";

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

describe("issueOidcState / consumeOidcState", () => {
  it("emite e consome um state válido, devolvendo o payload original", async () => {
    await prepararBanco();
    const { state } = await issueOidcState(app, SEGREDO, { surface: "host", returnTo: "/admin/eventos" });
    const payload = await consumeOidcState(app, SEGREDO, state);
    expect(payload.surface).toBe("host");
    expect(payload.returnTo).toBe("/admin/eventos");
  });

  it("state adulterado (assinatura trocada) é rejeitado", async () => {
    await prepararBanco();
    const { state } = await issueOidcState(app, SEGREDO, { surface: "staff", returnTo: "/console" });
    const [material] = state.split(".");
    const adulterado = `${material}.assinaturaFalsa`;
    await expect(consumeOidcState(app, SEGREDO, adulterado)).rejects.toThrow(InvalidOidcStateError);
  });

  it("state expirado é rejeitado", async () => {
    await prepararBanco();
    const { state, nonce } = await issueOidcState(app, SEGREDO, { surface: "host", returnTo: "/admin" });
    const nonceHash = createHash("sha256").update(nonce).digest();
    await admin.query("UPDATE oidc_states SET expires_at = now() - interval '1 minute' WHERE nonce_hash = $1", [nonceHash]);
    await expect(consumeOidcState(app, SEGREDO, state)).rejects.toMatchObject({ reason: "expired" });
  });

  it("nonce reusado (callback duplicado) é rejeitado na segunda tentativa", async () => {
    await prepararBanco();
    const { state } = await issueOidcState(app, SEGREDO, { surface: "guest", returnTo: "/" });
    await consumeOidcState(app, SEGREDO, state);
    await expect(consumeOidcState(app, SEGREDO, state)).rejects.toMatchObject({ reason: "consumed" });
  });

  it("recusa surface fora do enum no schema", async () => {
    await prepararBanco();
    await expect(
      admin.query(
        `INSERT INTO oidc_states (nonce_hash, surface, return_to, expires_at)
         VALUES ($1, 'inventado', '/', now() + interval '10 minutes')`,
        [Buffer.from("hash-de-teste")],
      ),
    ).rejects.toThrow();
  });
});

describe("sanitizeReturnTo", () => {
  it("aceita path interno", () => {
    expect(sanitizeReturnTo("/admin/eventos/123", "host")).toBe("/admin/eventos/123");
  });

  it("returnTo externo, protocol-relative ou com esquema cai no default da superfície", () => {
    expect(sanitizeReturnTo("https://evil.example", "host")).toBe("/admin");
    expect(sanitizeReturnTo("//evil.example", "staff")).toBe("/console");
    expect(sanitizeReturnTo(undefined, "guest")).toBe("/");
    expect(sanitizeReturnTo("/ok\\..\\evil", "host")).toBe("/admin");
  });
});
