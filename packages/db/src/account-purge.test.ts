import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { enqueueAccountPurge, listPendingAccountPurgeJobs, markAccountPurgeKey } from "./account-purge";
import { purgeAccountDataOnClient } from "./retention-jobs";
import { prepararBanco } from "./testes/banco";

/**
 * `account_purge_jobs` não tem `event_id` nem RLS (migration 0066, mesmo
 * desenho de `audit_log`) — por isso os testes rodam contra `app`
 * (albora_app, sem BYPASSRLS) sem precisar de `comEvento`/`SET LOCAL`.
 */

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

async function criarConta(): Promise<string> {
  const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
    `purge-${Math.random().toString(36).slice(2)}@exemplo.test`,
  ]);
  return rows[0].id as string;
}

describe("enqueueAccountPurge", () => {
  it("grava uma linha pending por key, na mesma transação do client", async () => {
    const contaId = await criarConta();
    const keys = [`events/${contaId}/2026/09/a`, `events/${contaId}/2026/09/b`];

    const client = await app.connect();
    let ids: string[];
    try {
      await client.query("BEGIN");
      ids = await enqueueAccountPurge(client, contaId, keys);
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    expect(ids).toHaveLength(2);

    const { rows } = await admin.query(
      "SELECT storage_key, status FROM account_purge_jobs WHERE account_id = $1 ORDER BY storage_key",
      [contaId],
    );
    expect(rows).toEqual([
      { storage_key: keys[0], status: "pending" },
      { storage_key: keys[1], status: "pending" },
    ]);
  });

  it("não grava nada para lista vazia", async () => {
    const contaId = await criarConta();
    const client = await app.connect();
    let ids: string[];
    try {
      await client.query("BEGIN");
      ids = await enqueueAccountPurge(client, contaId, []);
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    expect(ids).toEqual([]);
  });

  it("rollback da transação desfaz o enfileiramento junto — a fila nunca aponta para uma conta que não foi excluída", async () => {
    const contaId = await criarConta();
    const client = await app.connect();
    try {
      await client.query("BEGIN");
      await enqueueAccountPurge(client, contaId, ["events/x/y"]);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }

    const { rows } = await admin.query("SELECT 1 FROM account_purge_jobs WHERE account_id = $1", [contaId]);
    expect(rows).toHaveLength(0);
  });
});

describe("markAccountPurgeKey", () => {
  it("sucesso marca purged e incrementa attempts", async () => {
    const contaId = await criarConta();

    const client = await app.connect();
    let jobId: string;
    try {
      await client.query("BEGIN");
      jobId = (await enqueueAccountPurge(client, contaId, ["events/x/purged"]))[0]!;
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    await markAccountPurgeKey(app, jobId, { ok: true });

    const { rows } = await admin.query(
      "SELECT status, attempts, purged_at FROM account_purge_jobs WHERE id = $1",
      [jobId],
    );
    expect(rows[0].status).toBe("purged");
    expect(rows[0].attempts).toBe(1);
    expect(rows[0].purged_at).not.toBeNull();
  });

  it("falha deixa status='failed' com last_error, e listPendingAccountPurgeJobs devolve a linha", async () => {
    const contaId = await criarConta();
    const client = await app.connect();
    let jobId: string;
    try {
      await client.query("BEGIN");
      jobId = (await enqueueAccountPurge(client, contaId, ["events/x/orfao"]))[0]!;
      await client.query("COMMIT");
    } finally {
      client.release();
    }

    await markAccountPurgeKey(app, jobId, { ok: false, error: "R2 indisponível" });

    const { rows } = await admin.query("SELECT status, attempts, last_error FROM account_purge_jobs WHERE id = $1", [
      jobId,
    ]);
    expect(rows[0]).toEqual({ status: "failed", attempts: 1, last_error: "R2 indisponível" });

    const pendentes = await listPendingAccountPurgeJobs(app);
    expect(pendentes.some((j) => j.id === jobId && j.status === "failed" && j.lastError === "R2 indisponível")).toBe(
      true,
    );
  });
});

describe("listPendingAccountPurgeJobs", () => {
  it("não devolve linhas já purgadas", async () => {
    const contaId = await criarConta();
    const client = await app.connect();
    let jobId: string;
    try {
      await client.query("BEGIN");
      jobId = (await enqueueAccountPurge(client, contaId, ["events/x/ja-purgado"]))[0]!;
      await client.query("COMMIT");
    } finally {
      client.release();
    }
    await markAccountPurgeKey(app, jobId, { ok: true });

    const pendentes = await listPendingAccountPurgeJobs(app);
    expect(pendentes.some((j) => j.id === jobId)).toBe(false);
  });
});

describe("durabilidade end-to-end", () => {
  it(
    "a exclusão de conta enfileira as keys, e elas continuam pending mesmo que o purge de R2 nunca rode — a prova da fila acionável",
    { timeout: 90_000 },
    async () => {
      const pools = await prepararBanco();
      admin = pools.admin;
      app = pools.app;

      const contaId = await criarConta();
      await admin.query("INSERT INTO packs (id) VALUES ('pack-purge-e2e') ON CONFLICT (id) DO NOTHING");
      const { rows: evento } = await admin.query(
        `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
         VALUES ($1, 'pack-purge-e2e', $2, now(), now() + interval '6 hours', 'active') RETURNING id`,
        [contaId, `evento-purge-e2e-${Math.random().toString(36).slice(2)}`],
      );
      const eventoId = evento[0].id as string;
      const { rows: sessao } = await admin.query(
        `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
         VALUES ($1, 'convidado-purge-e2e', 'v1', now()) RETURNING id`,
        [eventoId],
      );
      const sessaoId = sessao[0].id as string;
      const storageKey = `events/${eventoId}/2026/09/foto-e2e/full`;
      await admin.query(
        `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
         VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 1000, 'published')`,
        [eventoId, sessaoId, storageKey],
      );

      const client = await app.connect();
      try {
        await client.query("BEGIN");
        const purge = await purgeAccountDataOnClient(client, contaId, {});
        const purgeJobIds = await enqueueAccountPurge(client, contaId, purge.keysToDelete);
        expect(purgeJobIds).toHaveLength(1);
        await client.query("COMMIT");
      } finally {
        client.release();
      }

      // Ninguém chamou markAccountPurgeKey — simula o purge de R2 pós-commit nunca rodando.
      const { rows } = await admin.query(
        "SELECT status, storage_key FROM account_purge_jobs WHERE account_id = $1",
        [contaId],
      );
      expect(rows).toEqual([{ status: "pending", storage_key: storageKey }]);
    },
  );
});
