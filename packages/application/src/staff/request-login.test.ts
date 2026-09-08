import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createStaffUser, listSecurityEvents } from "@albora/db";
import { requestStaffLogin } from "./request-login";
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

describe("requestStaffLogin", () => {
  it("e-mail inexistente devolve a mesma resposta que um e-mail existente", async () => {
    await createStaffUser(admin, { email: "existe@equipe.test", name: "Existe" });

    const enviosRecebidos: string[] = [];
    const sendEmail = async ({ to }: { to: string; token: string }) => {
      enviosRecebidos.push(to);
    };

    const respostaExistente = await requestStaffLogin(app, { email: "existe@equipe.test", ipHash: "ip-1", sendEmail });
    const respostaInexistente = await requestStaffLogin(app, { email: "naoexiste@equipe.test", ipHash: "ip-2", sendEmail });

    expect(respostaExistente).toEqual(respostaInexistente);
    expect(enviosRecebidos).toEqual(["existe@equipe.test"]);
  });

  it("estouro de rate limit grava evento de segurança e ainda devolve a mesma resposta", async () => {
    const sendEmail = async () => {};
    for (let i = 0; i < 5; i++) {
      await requestStaffLogin(app, { email: `flood-${i}@equipe.test`, ipHash: "ip-flood", sendEmail });
    }
    const resposta = await requestStaffLogin(app, { email: "flood-extra@equipe.test", ipHash: "ip-flood", sendEmail });
    expect(resposta).toEqual({ sent: true });

    const { rows } = await listSecurityEvents(app, { kind: "rate_limit.exceeded", limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
  });
});
