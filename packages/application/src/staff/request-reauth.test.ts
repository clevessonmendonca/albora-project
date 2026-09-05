import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createStaffUser, listSecurityEvents } from "@albora/db";
import { requestStaffReauth } from "./request-reauth";
import { resetRateLimit } from "./rate-limit";

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

beforeEach(() => {
  resetRateLimit();
});

describe("requestStaffReauth", () => {
  it("envia o link de confirmação para o e-mail do staff", async () => {
    const staff = await createStaffUser(admin, { email: "reauth-envia@equipe.test", name: "Envia" });

    let enviadoPara = "";
    await requestStaffReauth(app, {
      staffUserId: staff.id,
      email: staff.email,
      ipHash: "ip-1",
      sendEmail: async ({ to }) => {
        enviadoPara = to;
      },
    });

    expect(enviadoPara).toBe(staff.email);
  });

  it("estouro de rate limit grava evento de segurança e ainda devolve a mesma resposta", async () => {
    const staff = await createStaffUser(admin, { email: "reauth-flood@equipe.test", name: "Flood" });
    const sendEmail = async () => {};

    for (let i = 0; i < 5; i++) {
      await requestStaffReauth(app, { staffUserId: staff.id, email: staff.email, ipHash: "ip-flood-reauth", sendEmail });
    }
    const resposta = await requestStaffReauth(app, {
      staffUserId: staff.id,
      email: staff.email,
      ipHash: "ip-flood-reauth",
      sendEmail,
    });
    expect(resposta).toEqual({ sent: true });

    const { rows } = await listSecurityEvents(app, { kind: "rate_limit.exceeded", actorId: staff.id, limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
  });
});
