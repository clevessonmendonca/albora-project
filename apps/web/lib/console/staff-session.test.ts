import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prepararBanco } from "@albora/db/testes/banco";
import { assignStaffRole, createStaffUser } from "@albora/db";

// `config()` (apps/web/lib/config.ts) exige as variáveis abaixo mesmo quando
// só usamos `sessionSecret` — memoiza globalmente na primeira chamada que
// passa, então valores dummy aqui bastam para o resto do módulo.
process.env.SESSION_SECRET = "s".repeat(32);
process.env.DATABASE_URL = "postgres://x";
process.env.R2_ACCOUNT_ID = "conta-de-teste";
process.env.R2_ACCESS_KEY_ID = "chave-de-teste";
process.env.R2_SECRET_ACCESS_KEY = "segredo-de-teste";
process.env.R2_BUCKET = "bucket-de-teste";

const { poolRef, cookieStore } = vi.hoisted(() => ({
  poolRef: { current: null as pg.Pool | null },
  cookieStore: new Map<string, string>(),
}));

vi.mock("@/lib/db", () => ({ getPool: () => poolRef.current }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (cookieStore.has(name) ? { name, value: cookieStore.get(name) } : undefined),
    set: (name: string, value: string) => { cookieStore.set(name, value); },
    delete: (name: string) => { cookieStore.delete(name); },
  }),
}));

import { ABSOLUTE_TTL_SECONDS, STAFF_COOKIE, issueStaffSession, resolveActor } from "./staff-session";

let admin: pg.Pool;
let app: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  poolRef.current = app;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
});

beforeEach(() => {
  cookieStore.clear();
});

async function criarStaff(email: string) {
  const staff = await createStaffUser(admin, { email, name: "Equipe" });
  await assignStaffRole(admin, staff.id, "owner");
  return staff;
}

describe("resolveActor", () => {
  it("sem cookie devolve null", async () => {
    expect(await resolveActor()).toBeNull();
  });

  it("sessão válida resolve o ator", async () => {
    const staff = await criarStaff("valida@equipe.test");
    await issueStaffSession(staff.id);
    const actor = await resolveActor();
    expect(actor?.staffUserId).toBe(staff.id);
    expect(actor?.roles).toContain("owner");
  });

  it("sessão expirada resolve null", async () => {
    const staff = await criarStaff("expirada@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_sessions SET expires_at = now() - interval '1 hour' WHERE staff_user_id = $1", [staff.id]);
    expect(await resolveActor()).toBeNull();
  });

  it("sessão ociosa resolve null", async () => {
    const staff = await criarStaff("ociosa@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_sessions SET last_used_at = now() - interval '1 hour' WHERE staff_user_id = $1", [staff.id]);
    expect(await resolveActor()).toBeNull();
  });

  it("usuário suspended resolve null mesmo com sessão válida", async () => {
    const staff = await criarStaff("suspenso@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_users SET status = 'suspended' WHERE id = $1", [staff.id]);
    expect(await resolveActor()).toBeNull();
  });

  it("sessão revogada dispara detecção de reuso e revoga a cadeia", async () => {
    const staff = await criarStaff("reuso@equipe.test");
    await issueStaffSession(staff.id);
    await admin.query("UPDATE staff_sessions SET revoked_at = now() WHERE staff_user_id = $1", [staff.id]);

    expect(await resolveActor()).toBeNull();

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM security_events WHERE kind = 'session.reuse'",
    );
    expect(Number(rows[0]?.n)).toBeGreaterThan(0);
  });

  it("reuso revoga a cadeia inteira, não só a sessão apresentada", async () => {
    // Cenário do roubo: staff rotaciona (token A -> B), atacante reaparece com
    // A (já revogado). A detecção precisa matar B também — se só revogasse A
    // de novo, o atacante já teria o efeito colateral, mas o dono legítimo
    // seguiria autenticado em B enquanto o roubo já está provado.
    const staff = await criarStaff("cadeia@equipe.test");
    await issueStaffSession(staff.id);
    const tokenA = cookieStore.get(STAFF_COOKIE)!;

    await admin.query(
      "UPDATE staff_sessions SET created_at = now() - make_interval(secs => $1) WHERE staff_user_id = $2",
      [ABSOLUTE_TTL_SECONDS / 2 + 60, staff.id],
    );
    await resolveActor(); // rotaciona A -> B; A fica revogado, B é a sessão viva
    const tokenB = cookieStore.get(STAFF_COOKIE)!;
    expect(tokenB).not.toBe(tokenA);

    // Atacante reaparece com o token A, já rotacionado/revogado.
    cookieStore.set(STAFF_COOKIE, tokenA);
    expect(await resolveActor()).toBeNull();

    // B também precisa estar revogado agora, mesmo sem nunca ter sido
    // apresentado a resolveActor como token revogado diretamente.
    cookieStore.set(STAFF_COOKIE, tokenB);
    expect(await resolveActor()).toBeNull();

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM staff_sessions WHERE staff_user_id = $1 AND revoked_at IS NOT NULL",
      [staff.id],
    );
    expect(Number(rows[0]?.n)).toBeGreaterThanOrEqual(2);
  });

  it("assinatura inválida é rejeitada sem tocar o banco", async () => {
    const consultas = vi.spyOn(app, "query");
    cookieStore.set(STAFF_COOKIE, "token-forjado-sem-assinatura-valida");

    expect(await resolveActor()).toBeNull();
    expect(consultas).not.toHaveBeenCalled();

    consultas.mockRestore();
  });

  it("rotação troca o token quando passa de metade do TTL absoluto e encadeia rotated_from", async () => {
    const staff = await criarStaff("rotaciona@equipe.test");
    await issueStaffSession(staff.id);
    const tokenAntigo = cookieStore.get(STAFF_COOKIE);

    await admin.query(
      "UPDATE staff_sessions SET created_at = now() - make_interval(secs => $1) WHERE staff_user_id = $2",
      [ABSOLUTE_TTL_SECONDS / 2 + 60, staff.id],
    );

    await resolveActor();
    const tokenNovo = cookieStore.get(STAFF_COOKIE);
    expect(tokenNovo).toBeDefined();
    expect(tokenNovo).not.toBe(tokenAntigo);

    const { rows } = await admin.query<{ rotated_from: string | null }>(
      `SELECT rotated_from FROM staff_sessions
        WHERE staff_user_id = $1 AND revoked_at IS NULL`,
      [staff.id],
    );
    expect(rows[0]?.rotated_from).not.toBeNull();
  });
});
