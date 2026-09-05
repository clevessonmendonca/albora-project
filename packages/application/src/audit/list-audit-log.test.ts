import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { insertAuditLog } from "@albora/db";
import { prepararBanco } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { listAudit } from "./list-audit-log";

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

function actor(roles: string[]) {
  return { staffUserId: "s1", roles: roles as never, sessionId: "sess", requestId: "req", reauthenticatedAt: null };
}

function marcador(): string {
  return randomUUID();
}

async function inserirEntrada(actorId: string, action: string): Promise<void> {
  const client = await app.connect();
  try {
    await insertAuditLog(client, {
      actorKind: "staff",
      actorId,
      action,
      targetKind: "platform",
      reason: "entrada de teste",
    });
  } finally {
    client.release();
  }
}

describe("listAudit", () => {
  it("nega quem não tem audit.read", async () => {
    await expect(listAudit({ pool: {} as never }, { actor: actor(["support"]), limit: 20 })).rejects.toThrow(
      CommandDeniedError,
    );
  });

  it("não passa por withPlatformAggregation — chama listAuditLog direto no pool normal", async () => {
    const query = vi.fn().mockResolvedValue({ rows: [] });
    const pool = { query } as never;
    await listAudit({ pool }, { actor: actor(["owner"]), limit: 20 });
    expect(query).toHaveBeenCalled();
  });

  it("paginação por cursor não repete linha entre páginas", async () => {
    const ator = marcador();
    await inserirEntrada(ator, "test.page.1");
    await inserirEntrada(ator, "test.page.2");
    await inserirEntrada(ator, "test.page.3");

    const pagina1 = await listAudit({ pool: app }, { actor: actor(["owner"]), actorId: ator, limit: 2 });
    expect(pagina1.rows).toHaveLength(2);
    expect(pagina1.nextCursor).not.toBeNull();

    const pagina2 = await listAudit(
      { pool: app },
      { actor: actor(["owner"]), actorId: ator, limit: 2, cursor: pagina1.nextCursor! },
    );
    expect(pagina2.rows).toHaveLength(1);

    const idsPagina1 = new Set(pagina1.rows.map((r) => r.id));
    const idsPagina2 = new Set(pagina2.rows.map((r) => r.id));
    for (const id of idsPagina2) expect(idsPagina1.has(id)).toBe(false);
    expect(idsPagina1.size + idsPagina2.size).toBe(3);
  });

  it("filtro por ator devolve só as entradas daquele ator", async () => {
    const atorA = marcador();
    const atorB = marcador();
    await inserirEntrada(atorA, "test.actor.a1");
    await inserirEntrada(atorA, "test.actor.a2");
    await inserirEntrada(atorB, "test.actor.b1");

    const { rows } = await listAudit({ pool: app }, { actor: actor(["owner"]), actorId: atorA, limit: 50 });

    expect(rows.length).toBe(2);
    expect(rows.every((r) => r.actorId === atorA)).toBe(true);
  });
});
