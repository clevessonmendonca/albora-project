import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { createStaffMagicLink, createStaffUser, listAuditLog, listSecurityEvents } from "@albora/db";
import { completeStaffReauth } from "./complete-reauth";
import { requestStaffReauth } from "./request-reauth";
import { generateStaffMagicLinkToken } from "./token";

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

async function pedirEcapturar(staffUserId: string, ipHash: string): Promise<string> {
  let capturado = "";
  await requestStaffReauth(app, {
    staffUserId,
    ipHash,
    sendEmail: ({ token }) => {
      capturado = token;
    },
  });
  return capturado;
}

describe("completeStaffReauth", () => {
  it("token de step-up usado duas vezes: o segundo falha", async () => {
    const staff = await createStaffUser(admin, { email: "reauth-duplo@equipe.test", name: "Duplo" });
    const token = await pedirEcapturar(staff.id, "ip-x");

    const primeira = await completeStaffReauth(app, { token, ipHash: "ip-x", staffUserId: staff.id });
    expect(primeira.ok).toBe(true);

    const segunda = await completeStaffReauth(app, { token, ipHash: "ip-x", staffUserId: staff.id });
    expect(segunda.ok).toBe(false);
  });

  it("token expirado falha e grava security_events kind='reauth.failed'", async () => {
    const staff = await createStaffUser(admin, { email: "reauth-expirado@equipe.test", name: "Expirado" });
    const { token, tokenHash } = generateStaffMagicLinkToken();
    await createStaffMagicLink(admin, {
      staffUserId: staff.id,
      tokenHash,
      expiresAt: new Date(Date.now() - 1000),
    });

    const resultado = await completeStaffReauth(app, { token, ipHash: "ip-expirado", staffUserId: staff.id });
    expect(resultado.ok).toBe(false);

    const { rows } = await listSecurityEvents(app, { kind: "reauth.failed", actorId: staff.id, limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
  });

  it("assinatura inválida é rejeitada sem tocar o banco", async () => {
    const consultas = vi.spyOn(app, "query");

    const resultado = await completeStaffReauth(app, {
      token: "token-forjado-sem-assinatura-valida",
      ipHash: "ip-forjado",
      staffUserId: "11111111-1111-1111-1111-111111111111",
    });

    expect(resultado.ok).toBe(false);
    expect(consultas).not.toHaveBeenCalled();
    consultas.mockRestore();
  });

  it("link de outro staff não reautentica a sessão atual, e grava reauth.failed", async () => {
    const dono = await createStaffUser(admin, { email: "reauth-dono@equipe.test", name: "Dono" });
    const outro = await createStaffUser(admin, { email: "reauth-outro@equipe.test", name: "Outro" });
    const token = await pedirEcapturar(dono.id, "ip-cruzado");

    const resultado = await completeStaffReauth(app, { token, ipHash: "ip-cruzado", staffUserId: outro.id });
    expect(resultado.ok).toBe(false);

    const { rows } = await listSecurityEvents(app, { kind: "reauth.failed", actorId: outro.id, limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
  });

  it("sucesso grava audit_log com action='staff.reauth'", async () => {
    const staff = await createStaffUser(admin, { email: "reauth-audita@equipe.test", name: "Audita" });
    const token = await pedirEcapturar(staff.id, "ip-audita");

    const resultado = await completeStaffReauth(app, { token, ipHash: "ip-audita", staffUserId: staff.id });
    expect(resultado.ok).toBe(true);

    const { rows } = await listAuditLog(app, { action: "staff.reauth", targetId: staff.id, limit: 5 });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]?.actorId).toBe(staff.id);
  });
});
