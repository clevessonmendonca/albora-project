import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { completeGoogleLoginStaff } from "./complete-google-login-staff";

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

async function staffAtivo() {
  const sufixo = Math.random().toString(36).slice(2);
  const email = `staff-${sufixo}@albora.com`;
  const { rows } = await admin.query<{ id: string }>(
    "INSERT INTO staff_users (email, name, status) VALUES ($1, $2, 'active') RETURNING id",
    [email, "Staff de Teste"],
  );
  return { id: rows[0]!.id, email };
}

describe("completeGoogleLoginStaff", () => {
  it("staff ativo entra e grava audit_log staff.login", async () => {
    await prepararBanco();
    const { id, email } = await staffAtivo();

    const resultado = await completeGoogleLoginStaff(app, { email, ipHash: "hash-ip" });
    expect(resultado).toEqual({ ok: true, staffUserId: id });

    const { rows } = await admin.query(
      "SELECT action, target_kind, target_id, metadata FROM audit_log WHERE action = 'staff.login' AND target_id = $1",
      [id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.target_kind).toBe("staff_user");
    expect(rows[0]?.metadata).toMatchObject({ via: "google" });
  });

  it("e-mail que não é da equipe nega, com mensagem genérica e security_events", async () => {
    await prepararBanco();
    const resultado = await completeGoogleLoginStaff(app, { email: "estranho@gmail.com", ipHash: "hash-ip" });
    expect(resultado).toEqual({ ok: false });

    const { rows } = await admin.query(
      "SELECT kind, metadata FROM security_events WHERE kind = 'login.failed' ORDER BY at DESC LIMIT 1",
    );
    expect(rows[0]?.metadata).toMatchObject({ surface: "staff_google" });
  });

  it("staff suspenso nega EXATAMENTE como e-mail inexistente — não vira oráculo", async () => {
    await prepararBanco();
    const sufixo = Math.random().toString(36).slice(2);
    const email = `staff-suspenso-${sufixo}@albora.com`;
    await admin.query("INSERT INTO staff_users (email, name, status) VALUES ($1, $2, 'suspended')", [email, "Suspenso"]);

    const resultado = await completeGoogleLoginStaff(app, { email, ipHash: "hash-ip" });
    expect(resultado).toEqual({ ok: false });
  });

  it("NUNCA cria staff novo", async () => {
    await prepararBanco();
    const email = `nunca-existiu-${Math.random().toString(36).slice(2)}@gmail.com`;
    await completeGoogleLoginStaff(app, { email, ipHash: "hash-ip" });
    const { rows } = await admin.query("SELECT id FROM staff_users WHERE email = $1", [email]);
    expect(rows).toHaveLength(0);
  });

  it("nunca loga e-mail cru em security_events", async () => {
    await prepararBanco();
    const email = `nao-e-equipe-${Math.random().toString(36).slice(2)}@gmail.com`;
    await completeGoogleLoginStaff(app, { email, ipHash: "hash-ip" });

    const { rows } = await admin.query<{ metadata: Record<string, unknown> }>(
      "SELECT metadata FROM security_events WHERE kind = 'login.failed' ORDER BY at DESC LIMIT 1",
    );
    expect(JSON.stringify(rows[0]?.metadata ?? {})).not.toContain(email);
  });
});
