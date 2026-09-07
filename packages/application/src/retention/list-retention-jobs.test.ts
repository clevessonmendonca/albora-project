import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { CommandDeniedError } from "../envelope/errors";
import { listRetentionJobs, sanitizeRetentionError } from "./list-retention-jobs";

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await app?.end();
  await agregador?.end();
});

function actor(roles: string[]) {
  return {
    staffUserId: "11111111-1111-1111-1111-111111111111",
    roles: roles as never,
    sessionId: "sess",
    requestId: "req",
    reauthenticatedAt: null,
  };
}

async function criarEvento(endsAt: Date): Promise<string> {
  const slug = `evt-${Math.random().toString(36).slice(2, 10)}`;
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
     VALUES ($1, 'pack-um', $2, $3, $4, 'active') RETURNING id`,
    [dados.a.contaId, slug, new Date(endsAt.getTime() - 6 * 3600 * 1000), endsAt],
  );
  const eventoId = rows[0]!.id;
  await admin.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [slug, eventoId]);
  return eventoId;
}

describe("listRetentionJobs", () => {
  it("nega quem não tem retention.read, e a query não roda", async () => {
    await expect(
      listRetentionJobs(
        { pool: {} as never, aggregatorPool: {} as never },
        { actor: actor(["finance"]), reason: "abrir /console/retention", limit: 20 },
      ),
    ).rejects.toThrow(CommandDeniedError);
  });

  it("filtro por status devolve só o status pedido", async () => {
    const eventoId = await criarEvento(new Date(Date.now() + 3600 * 1000));
    await admin.query(
      `INSERT INTO retention_jobs (event_id, kind, status, due_at, last_error)
       VALUES ($1, 'd330_drive', 'failed', now() + interval '3 days', 'export_missing')`,
      [eventoId],
    );
    await admin.query(
      `INSERT INTO retention_jobs (event_id, kind, status, due_at)
       VALUES ($1, 'plus_48h', 'pending', now() + interval '1 day')`,
      [eventoId],
    );

    const { rows } = await listRetentionJobs(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir /console/retention", status: "failed", limit: 100 },
    );

    const doEvento = rows.filter((r) => r.eventId === eventoId);
    expect(doEvento).toHaveLength(1);
    expect(doEvento[0]?.status).toBe("failed");
  });

  it("last_error chega sanitizado até a linha, não cru", async () => {
    const eventoId = await criarEvento(new Date(Date.now() + 3600 * 1000));
    await admin.query(
      `INSERT INTO retention_jobs (event_id, kind, status, due_at, last_error)
       VALUES ($1, 'd358_warn', 'failed', now() + interval '2 days', $2)`,
      [eventoId, "erro ao notificar convidado@exemplo.test: timeout"],
    );

    const { rows } = await listRetentionJobs(
      { pool: app, aggregatorPool: agregador },
      { actor: actor(["owner"]), reason: "abrir /console/retention", status: "failed", limit: 100 },
    );

    const linha = rows.find((r) => r.eventId === eventoId);
    expect(linha?.lastError).not.toContain("convidado@exemplo.test");
    expect(linha?.lastError).toContain("[e-mail]");
  });
});

describe("sanitizeRetentionError", () => {
  it("mascara e-mail e trunca mensagem longa", () => {
    const bruto = `x@y.test ${"a".repeat(200)}`;
    const limpo = sanitizeRetentionError(bruto);
    expect(limpo).not.toContain("x@y.test");
    expect(limpo).toContain("[e-mail]");
    expect(limpo?.length).toBeLessThanOrEqual(161);
  });

  it("null passa direto", () => {
    expect(sanitizeRetentionError(null)).toBeNull();
  });
});
