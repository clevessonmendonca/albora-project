import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  claimNextForModeration,
  completeModeration,
  enqueueModeration,
  failModeration,
} from "./moderation-queue";
import { prepararBanco, semear } from "./testes/banco";

/**
 * Contra banco real — RLS escopa ao evento e `FOR UPDATE SKIP LOCKED` é o que
 * impede dois workers de reivindicarem o mesmo item pendente; mock de lock
 * provaria só que o mock não trava.
 */

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

/** Espelha o INSERT de `semear` em banco.ts — mais um upload sob o mesmo evento/sessão pra encher a fila. */
async function criarUpload(eventoId: string, sessaoId: string): Promise<string> {
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes)
     VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000) RETURNING id`,
    [eventoId, sessaoId, `events/${eventoId}/2026/08/moderacao/${Math.random()}`],
  );
  return rows[0]!.id;
}

async function statusDe(uploadId: string): Promise<string> {
  const { rows } = await admin.query<{ status: string }>(
    "SELECT status FROM photo_moderation WHERE upload_id = $1",
    [uploadId],
  );
  return rows[0]!.status;
}

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

// Cada teste enfileira seus próprios uploads mas nem todos os claimam (o de idempotência
// nunca claima) — sem isto, pending de um teste vaza pro `LIMIT` generoso do próximo.
beforeEach(async () => {
  await admin.query("DELETE FROM photo_moderation");
});

describe("enqueueModeration é idempotente", () => {
  it("chamar duas vezes para o mesmo uploadId não duplica nem estoura", async () => {
    const uploadId = await criarUpload(dados.a.eventoId, dados.a.sessaoId);

    await comEvento(app, dados.a.eventoId, (c) =>
      enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
    );
    await expect(
      comEvento(app, dados.a.eventoId, (c) =>
        enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
      ),
    ).resolves.toBeUndefined();

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM photo_moderation WHERE upload_id = $1",
      [uploadId],
    );
    expect(rows[0]!.n).toBe(1);
  });
});

describe("claimNextForModeration — dois claims concorrentes não pegam o mesmo item", () => {
  it("quatro claims disparados juntos, com o pool inteiro, dividem oito itens sem sobrepor", async () => {
    // Oito pendentes, quatro chamadas concorrentes de 2 cada — cobre exatamente o pool de 4 conexões
    // de `prepararBanco`, então as quatro rodam em conexões físicas distintas ao mesmo tempo, não em fila.
    const uploadIds = await Promise.all(
      Array.from({ length: 8 }, () => criarUpload(dados.a.eventoId, dados.a.sessaoId)),
    );
    await Promise.all(
      uploadIds.map((uploadId) =>
        comEvento(app, dados.a.eventoId, (c) =>
          enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
        ),
      ),
    );

    const resultados = await Promise.all(
      Array.from({ length: 4 }, () =>
        comEvento(app, dados.a.eventoId, (c) => claimNextForModeration(c, dados.a.eventoId, 2)),
      ),
    );

    const claimados = resultados.flatMap((r) => r.map((item) => item.uploadId));
    const unicos = new Set(claimados);

    // O teste central: nenhum uploadId aparece em mais de um resultado — é o que SKIP LOCKED garante
    // entre transações sobrepostas, ao contrário de uma constraint UNIQUE sozinha.
    expect(unicos.size).toBe(claimados.length);

    // E os oito enfileirados foram todos reivindicados — nenhum ficou pra trás, nenhum sumiu.
    for (const uploadId of uploadIds) {
      expect(claimados).toContain(uploadId);
    }

    for (const item of resultados.flat()) {
      expect(item.eventId).toBe(dados.a.eventoId);
      expect(item.attempts).toBe(1);
    }
  });

  it("um item já claimed não volta pra fila — claim seguinte não o repete", async () => {
    const uploadId = await criarUpload(dados.a.eventoId, dados.a.sessaoId);
    await comEvento(app, dados.a.eventoId, (c) =>
      enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
    );

    const primeiro = await comEvento(app, dados.a.eventoId, (c) =>
      claimNextForModeration(c, dados.a.eventoId, 10),
    );
    expect(primeiro.map((i) => i.uploadId)).toContain(uploadId);

    const segundo = await comEvento(app, dados.a.eventoId, (c) =>
      claimNextForModeration(c, dados.a.eventoId, 10),
    );
    expect(segundo.map((i) => i.uploadId)).not.toContain(uploadId);
  });
});

describe("completeModeration", () => {
  it("grava provider, result e completed_at, e leva status a done", async () => {
    const uploadId = await criarUpload(dados.a.eventoId, dados.a.sessaoId);
    await comEvento(app, dados.a.eventoId, (c) =>
      enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
    );

    await comEvento(app, dados.a.eventoId, (c) =>
      completeModeration(c, uploadId, {
        provider: "provedor-de-teste",
        result: { categorias: ["ok"], escore: 0.02 },
      }),
    );

    const { rows } = await admin.query(
      "SELECT status, provider, result, completed_at FROM photo_moderation WHERE upload_id = $1",
      [uploadId],
    );
    expect(rows[0].status).toBe("done");
    expect(rows[0].provider).toBe("provedor-de-teste");
    expect(rows[0].result).toEqual({ categorias: ["ok"], escore: 0.02 });
    expect(rows[0].completed_at).not.toBeNull();
  });
});

describe("failModeration", () => {
  it("conta o ciclo real claim -> fail: retry abaixo do teto, failed no teto", async () => {
    const uploadId = await criarUpload(dados.a.eventoId, dados.a.sessaoId);
    await comEvento(app, dados.a.eventoId, (c) =>
      enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
    );

    // Uma tentativa e um claim seguido de fail. Testar `failModeration`
    // sozinho escondia o bug de contagem dupla: o claim ja incrementa.
    for (const esperado of ["retry", "retry"] as const) {
      const [item] = await comEvento(app, dados.a.eventoId, (c) =>
        claimNextForModeration(c, dados.a.eventoId, 1),
      );
      expect(item).toBeDefined();
      const r = await comEvento(app, dados.a.eventoId, (c) =>
        failModeration(c, uploadId, 3),
      );
      expect(r).toBe(esperado);
      expect(await statusDe(uploadId)).toBe("pending");
    }

    const [terceiro] = await comEvento(app, dados.a.eventoId, (c) =>
      claimNextForModeration(c, dados.a.eventoId, 1),
    );
    expect(terceiro).toBeDefined();
    const ultima = await comEvento(app, dados.a.eventoId, (c) =>
      failModeration(c, uploadId, 3),
    );
    expect(ultima).toBe("failed");
    expect(await statusDe(uploadId)).toBe("failed");

    const { rows } = await admin.query<{ attempts: number }>(
      "SELECT attempts FROM photo_moderation WHERE upload_id = $1",
      [uploadId],
    );
    // Exatamente 3, nao 6: so o claim conta.
    expect(rows[0]!.attempts).toBe(3);
  });

  it("item marcado failed nao volta em claim seguinte", async () => {
    const uploadId = await criarUpload(dados.a.eventoId, dados.a.sessaoId);
    await comEvento(app, dados.a.eventoId, (c) =>
      enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      claimNextForModeration(c, dados.a.eventoId, 1),
    );
    await comEvento(app, dados.a.eventoId, (c) => failModeration(c, uploadId, 1));
    expect(await statusDe(uploadId)).toBe("failed");

    const restantes = await comEvento(app, dados.a.eventoId, (c) =>
      claimNextForModeration(c, dados.a.eventoId, 10),
    );
    expect(restantes.map((i) => i.uploadId)).not.toContain(uploadId);
  });
});

describe("isolamento por evento", () => {
  it("um item enfileirado no evento A não é visível sob SET LOCAL do evento B", async () => {
    const uploadId = await criarUpload(dados.a.eventoId, dados.a.sessaoId);
    await comEvento(app, dados.a.eventoId, (c) =>
      enqueueModeration(c, { uploadId, eventId: dados.a.eventoId }),
    );

    const sobB = await comEvento(app, dados.b.eventoId, (c) =>
      claimNextForModeration(c, dados.b.eventoId, 10),
    );
    expect(sobB.map((i) => i.uploadId)).not.toContain(uploadId);

    // Sanidade: continua lá, visível e reivindicável sob o próprio evento.
    const sobA = await comEvento(app, dados.a.eventoId, (c) =>
      claimNextForModeration(c, dados.a.eventoId, 10),
    );
    expect(sobA.map((i) => i.uploadId)).toContain(uploadId);
  });
});
