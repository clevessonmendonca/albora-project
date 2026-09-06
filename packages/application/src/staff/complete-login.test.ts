import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createStaffUser, listAuditLog } from "@albora/db";
import { completeStaffLogin } from "./complete-login";
import { requestStaffLogin } from "./request-login";

process.env.SESSION_SECRET = "s".repeat(32);

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

describe("completeStaffLogin", () => {
  it("dois usos do mesmo token — o segundo falha", async () => {
    const staff = await createStaffUser(admin, { email: "duplo-login@equipe.test", name: "Duplo" });
    let capturedToken = "";
    await requestStaffLogin(app, {
      email: staff.email,
      ipHash: "ip-x",
      sendEmail: ({ token }) => {
        capturedToken = token;
      },
    });

    const primeira = await completeStaffLogin(app, { token: capturedToken, ipHash: "ip-x" });
    expect(primeira.ok).toBe(true);

    const segunda = await completeStaffLogin(app, { token: capturedToken, ipHash: "ip-x" });
    expect(segunda.ok).toBe(false);
  });

  it("login bem-sucedido grava audit_log com action='staff.login'", async () => {
    const staff = await createStaffUser(admin, { email: "audita-login@equipe.test", name: "Audita" });
    let capturedToken = "";
    await requestStaffLogin(app, {
      email: staff.email,
      ipHash: "ip-y",
      sendEmail: ({ token }) => {
        capturedToken = token;
      },
    });

    const resultado = await completeStaffLogin(app, { token: capturedToken, ipHash: "ip-y" });
    expect(resultado.ok).toBe(true);

    const { rows } = await listAuditLog(app, { action: "staff.login", targetId: staff.id, limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.actorId).toBe(staff.id);
  });
});
