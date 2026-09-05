import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";
import { authorize } from "@albora/core";
import {
  assignStaffRole,
  consumeStaffMagicLink,
  createStaffMagicLink,
  createStaffSession,
  createStaffUser,
  findSessionEvenIfRevoked,
  findStaffByEmail,
  markReauthenticated,
  resolveStaffSession,
  revokeSessionChain,
  revokeStaffSession,
  touchStaffSession,
} from "./staff";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

function tokenHash(): string {
  return createHash("sha256").update(randomBytes(16)).digest("hex");
}

describe("magic link de staff", () => {
  it("consumo duplo do mesmo link retorna null na segunda vez", async () => {
    const staff = await createStaffUser(admin, { email: "duplo@equipe.test", name: "Duplo" });
    const hash = tokenHash();
    await createStaffMagicLink(admin, {
      staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 900_000),
    });

    const primeiro = await consumeStaffMagicLink(admin, hash);
    expect(primeiro).toBe(staff.id);

    const segundo = await consumeStaffMagicLink(admin, hash);
    expect(segundo).toBeNull();
  });
});

describe("resolveStaffSession", () => {
  it("sessão expirada resolve null", async () => {
    const staff = await createStaffUser(admin, { email: "expirada@equipe.test", name: "Expirada" });
    await assignStaffRole(admin, staff.id, "support");
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() - 1000) });
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("sessão ociosa resolve null", async () => {
    const staff = await createStaffUser(admin, { email: "ociosa@equipe.test", name: "Ociosa" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await admin.query("UPDATE staff_sessions SET last_used_at = now() - interval '1 hour' WHERE token_hash = $1", [hash]);
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("sessão revogada resolve null", async () => {
    const staff = await createStaffUser(admin, { email: "revogada@equipe.test", name: "Revogada" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await revokeStaffSession(admin, hash);
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("usuário suspended resolve null mesmo com sessão válida", async () => {
    const staff = await createStaffUser(admin, { email: "suspenso@equipe.test", name: "Suspenso" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await admin.query("UPDATE staff_users SET status = 'suspended' WHERE id = $1", [staff.id]);
    expect(await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 })).toBeNull();
  });

  it("sessão válida resolve staffUserId e reauthenticatedAt", async () => {
    const staff = await createStaffUser(admin, { email: "valida@equipe.test", name: "Valida" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    const resolvida = await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 });
    expect(resolvida?.staffUserId).toBe(staff.id);
    expect(resolvida?.reauthenticatedAt).toBeNull();
  });
});

describe("markReauthenticated", () => {
  it("carimba reauthenticated_at na sessão existente (mesmo token_hash), não cria sessão nova", async () => {
    const staff = await createStaffUser(admin, { email: "reauth-carimbo@equipe.test", name: "Carimbo" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });

    await markReauthenticated(admin, hash);

    const resolvida = await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 });
    expect(resolvida?.reauthenticatedAt).not.toBeNull();

    const { rows } = await admin.query<{ n: string }>(
      "SELECT count(*)::text AS n FROM staff_sessions WHERE staff_user_id = $1",
      [staff.id],
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });

  it("depois do carimbo, authorize para lgpd.delete_account devolve allowed em vez de needsReauth", async () => {
    const staff = await createStaffUser(admin, { email: "reauth-destrava@equipe.test", name: "Destrava" });
    await assignStaffRole(admin, staff.id, "compliance");
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });

    const antes = await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 });
    const decisaoAntes = authorize({
      actor: { staffUserId: staff.id, roles: ["compliance"], sessionId: hash, requestId: "req-1", reauthenticatedAt: antes?.reauthenticatedAt ?? null },
      capability: "lgpd.delete_account",
    });
    expect(decisaoAntes.kind).toBe("needsReauth");

    await markReauthenticated(admin, hash);
    const depois = await resolveStaffSession(admin, hash, { idleMaxSeconds: 1800 });
    const decisaoDepois = authorize({
      actor: { staffUserId: staff.id, roles: ["compliance"], sessionId: hash, requestId: "req-2", reauthenticatedAt: depois?.reauthenticatedAt ?? null },
      capability: "lgpd.delete_account",
    });
    expect(decisaoDepois).toEqual({ kind: "allowed" });
  });
});

describe("revokeSessionChain", () => {
  it("rotação encadeada revoga toda a cadeia", async () => {
    const staff = await createStaffUser(admin, { email: "cadeia@equipe.test", name: "Cadeia" });
    const h1 = tokenHash();
    const h2 = tokenHash();
    const h3 = tokenHash();

    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: h1, expiresAt: new Date(Date.now() + 3_600_000) });
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: h2, expiresAt: new Date(Date.now() + 3_600_000), rotatedFrom: h1 });
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: h3, expiresAt: new Date(Date.now() + 3_600_000), rotatedFrom: h2 });

    const revogadas = await revokeSessionChain(admin, h1);
    expect(revogadas).toBe(3);

    for (const h of [h1, h2, h3]) {
      const linha = await findSessionEvenIfRevoked(admin, h);
      expect(linha?.revokedAt).not.toBeNull();
    }
  });
});

describe("touchStaffSession", () => {
  it("atualiza last_used_at", async () => {
    const staff = await createStaffUser(admin, { email: "toque@equipe.test", name: "Toque" });
    const hash = tokenHash();
    await createStaffSession(admin, { staffUserId: staff.id, tokenHash: hash, expiresAt: new Date(Date.now() + 3_600_000) });
    await admin.query("UPDATE staff_sessions SET last_used_at = now() - interval '10 minutes' WHERE token_hash = $1", [hash]);
    await touchStaffSession(admin, hash);
    const { rows } = await admin.query<{ last_used_at: Date }>("SELECT last_used_at FROM staff_sessions WHERE token_hash = $1", [hash]);
    expect(Date.now() - rows[0]!.last_used_at.getTime()).toBeLessThan(5000);
  });
});

describe("findStaffByEmail", () => {
  it("normaliza e-mail em minúsculas", async () => {
    await createStaffUser(admin, { email: "Maiuscula@Equipe.test", name: "Maiuscula" });
    const achado = await findStaffByEmail(admin, "MAIUSCULA@equipe.TEST");
    expect(achado?.email).toBe("maiuscula@equipe.test");
  });
});
