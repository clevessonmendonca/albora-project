import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { insertAuditLog, insertSecurityEvent, listAuditLog, listSecurityEvents } from "./audit";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

describe("audit_log é append-only por GRANT", () => {
  it("UPDATE lança quando conectado como o papel da aplicação", async () => {
    const client = await app.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "staff", action: "test.append_only", targetKind: "platform", reason: "prova de append-only",
      });
      await expect(client.query("UPDATE audit_log SET reason = 'alterado'")).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it("DELETE lança quando conectado como o papel da aplicação", async () => {
    const client = await app.connect();
    try {
      await expect(client.query("DELETE FROM audit_log")).rejects.toThrow();
    } finally {
      client.release();
    }
  });
});

describe("reason vazio viola o CHECK", () => {
  it("string vazia lança", async () => {
    const client = await app.connect();
    try {
      await expect(
        insertAuditLog(client, { actorKind: "system", action: "x", targetKind: "platform", reason: "" }),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });

  it("só espaço lança", async () => {
    const client = await app.connect();
    try {
      await expect(
        insertAuditLog(client, { actorKind: "system", action: "x", targetKind: "platform", reason: "   " }),
      ).rejects.toThrow();
    } finally {
      client.release();
    }
  });
});

describe("caminho feliz", () => {
  it("grava e lista por target_kind", async () => {
    const client = await app.connect();
    try {
      await insertAuditLog(client, {
        actorKind: "staff", action: "subscription.refund", targetKind: "subscription",
        targetId: "sub-1", reason: "reembolso solicitado pelo cliente",
      });
    } finally {
      client.release();
    }
    const { rows } = await listAuditLog(app, { targetKind: "subscription", limit: 10 });
    expect(rows.some((r) => r.action === "subscription.refund")).toBe(true);
  });
});

describe("security_events nunca lança", () => {
  it("insere normalmente e lista por kind", async () => {
    await expect(insertSecurityEvent(app, { kind: "login.failed" })).resolves.toBeUndefined();
    const { rows } = await listSecurityEvents(app, { kind: "login.failed", limit: 10 });
    expect(rows.some((r) => r.kind === "login.failed")).toBe(true);
  });
});
