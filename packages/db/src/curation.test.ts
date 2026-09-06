import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  claimCurationJobs,
  completeCurationJob,
  enqueueCuration,
  failCurationJob,
  listCurationScores,
  listEventsNeedingCurationEnqueue,
  listEventsWithPendingCuration,
  listUploadsAwaitingCurationScore,
  reclaimStaleCurationJob,
  saveCurationScores,
} from "./curation";
import { prepararBanco, semear } from "./testes/banco";

/**
 * Contra banco real — RLS escopa ao evento e `FOR UPDATE SKIP LOCKED` é o que
 * impede dois workers de reivindicarem o mesmo job; mock de lock provaria só
 * que o mock não trava.
 */

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

async function statusDoJob(eventId: string): Promise<string | null> {
  const { rows } = await admin.query<{ status: string }>(
    "SELECT status FROM curation_jobs WHERE event_id = $1",
    [eventId],
  );
  return rows[0]?.status ?? null;
}

/** Evento próprio (fora dos fixtures `dados.a`/`dados.b`) para não afetar o `ends_at` compartilhado por outros testes. */
async function criarEventoComEndsAt(accountId: string, endsAt: Date): Promise<string> {
  const slug = `evento-curadoria-${Math.random().toString(36).slice(2)}`;
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at)
     VALUES ($1, 'pack-um', $2, now() - interval '7 hours', $3) RETURNING id`,
    [accountId, slug, endsAt],
  );
  const eventoId = rows[0]!.id;
  await admin.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [slug, eventoId]);
  return eventoId;
}

async function criarUpload(eventoId: string, sessaoId: string): Promise<string> {
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
     VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000, 'published') RETURNING id`,
    [eventoId, sessaoId, `events/${eventoId}/2026/09/curadoria/${Math.random()}/full`],
  );
  return rows[0]!.id;
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

beforeEach(async () => {
  await admin.query("DELETE FROM curation_jobs");
  await admin.query("DELETE FROM media_curation_scores");
  await admin.query("DELETE FROM uploads WHERE id NOT IN ($1, $2)", [
    dados.a.uploadId,
    dados.b.uploadId,
  ]);
});

describe("enqueueCuration é idempotente", () => {
  it("chamar duas vezes para o mesmo evento não duplica nem estoura", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    await expect(
      comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId)),
    ).resolves.toBeUndefined();

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM curation_jobs WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.n).toBe(1);
  });
});

describe("claimCurationJobs — dois claims concorrentes não pegam o mesmo item", () => {
  it("dois eventos com job pending, dois claims disparados juntos, dividem os dois sem sobrepor", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    await comEvento(app, dados.b.eventoId, (c) => enqueueCuration(c, dados.b.eventoId));

    const [resultadoA, resultadoB] = await Promise.all([
      comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId)),
      comEvento(app, dados.b.eventoId, (c) => claimCurationJobs(c, dados.b.eventoId)),
    ]);

    expect(resultadoA).toHaveLength(1);
    expect(resultadoB).toHaveLength(1);
    expect(resultadoA[0]!.eventId).toBe(dados.a.eventoId);
    expect(resultadoB[0]!.eventId).toBe(dados.b.eventoId);
    expect(resultadoA[0]!.attempts).toBe(1);
  });

  it("duas conexões disputando o mesmo job (transações sobrepostas): só uma reivindica", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    // Duas conexões reais do pool, cada uma com sua própria transação/SET LOCAL,
    // disparadas juntas contra o MESMO evento — é o SKIP LOCKED que decide,
    // não a ordem de chegada. Duas chamadas em sequência não provariam nada.
    const [primeiro, segundo] = await Promise.all([
      comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId)),
      comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId)),
    ]);

    const vencedores = [primeiro, segundo].filter((r) => r.length > 0);
    expect(vencedores).toHaveLength(1);
    expect(vencedores[0]![0]!.eventId).toBe(dados.a.eventoId);

    expect(await statusDoJob(dados.a.eventoId)).toBe("processing");
  });

  it("um job já processing não volta em claim seguinte", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const primeiro = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    expect(primeiro).toHaveLength(1);

    const segundo = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    expect(segundo).toHaveLength(0);
  });
});

describe("completeCurationJob e failCurationJob ignoram linha que não está processing", () => {
  it("completeCurationJob leva status a done e completed_at", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));

    await comEvento(app, dados.a.eventoId, (c) => completeCurationJob(c, job!.id));

    const { rows } = await admin.query("SELECT status, completed_at FROM curation_jobs WHERE id = $1", [
      job!.id,
    ]);
    expect(rows[0].status).toBe("done");
    expect(rows[0].completed_at).not.toBeNull();
  });

  it("completeCurationJob não sobrescreve uma linha já done — worker zumbi destravado depois de outro já ter concluído", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => completeCurationJob(c, job!.id));

    await comEvento(app, dados.a.eventoId, (c) => completeCurationJob(c, job!.id));

    expect(await statusDoJob(dados.a.eventoId)).toBe("done");
  });

  it("failCurationJob conta o ciclo real claim→fail: retry abaixo do teto, failed no teto", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    for (const esperado of ["retry", "retry"] as const) {
      const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
      expect(job).toBeDefined();
      const r = await comEvento(app, dados.a.eventoId, (c) =>
        failCurationJob(c, job!.id, 3, "erro de teste"),
      );
      expect(r).toBe(esperado);
      expect(await statusDoJob(dados.a.eventoId)).toBe("pending");
    }

    const [terceiro] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    expect(terceiro).toBeDefined();
    const ultima = await comEvento(app, dados.a.eventoId, (c) => failCurationJob(c, terceiro!.id, 3));
    expect(ultima).toBe("failed");
    expect(await statusDoJob(dados.a.eventoId)).toBe("failed");

    const { rows } = await admin.query<{ attempts: number }>(
      "SELECT attempts FROM curation_jobs WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.attempts).toBe(3);
  });

  it("failCurationJob não devolve a pending (nem marca failed) uma linha já done", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => completeCurationJob(c, job!.id));

    const resultado = await comEvento(app, dados.a.eventoId, (c) => failCurationJob(c, job!.id, 3));
    expect(resultado).toBe("retry");
    expect(await statusDoJob(dados.a.eventoId)).toBe("done");
  });
});

describe("reclaimStaleCurationJob", () => {
  it("devolve a pending o claim órfão de processo morto, sem zerar attempts", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    expect(await statusDoJob(dados.a.eventoId)).toBe("processing");

    await admin.query(
      "UPDATE curation_jobs SET claimed_at = now() - interval '1 hour' WHERE event_id = $1",
      [dados.a.eventoId],
    );

    const devolvidos = await comEvento(app, dados.a.eventoId, (c) =>
      reclaimStaleCurationJob(c, dados.a.eventoId, 600),
    );
    expect(devolvidos).toBe(1);
    expect(await statusDoJob(dados.a.eventoId)).toBe("pending");

    const { rows } = await admin.query<{ attempts: number }>(
      "SELECT attempts FROM curation_jobs WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.attempts).toBe(1);

    const [reivindicado] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    expect(reivindicado).toBeDefined();
  });

  it("não mexe em claim recente", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));

    const devolvidos = await comEvento(app, dados.a.eventoId, (c) =>
      reclaimStaleCurationJob(c, dados.a.eventoId, 600),
    );
    expect(devolvidos).toBe(0);
    expect(await statusDoJob(dados.a.eventoId)).toBe("processing");
  });
});

describe("listEventsWithPendingCuration — rede de segurança do job periódico", () => {
  it("lista o evento com job pending", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    const eventos = await listEventsWithPendingCuration(admin, 100);
    expect(eventos).toContain(dados.a.eventoId);
  });

  it("não lista evento cujo job já é done", async () => {
    await comEvento(app, dados.b.eventoId, (c) => enqueueCuration(c, dados.b.eventoId));
    const [job] = await comEvento(app, dados.b.eventoId, (c) => claimCurationJobs(c, dados.b.eventoId));
    await comEvento(app, dados.b.eventoId, (c) => completeCurationJob(c, job!.id));

    const eventos = await listEventsWithPendingCuration(admin, 100);
    expect(eventos).not.toContain(dados.b.eventoId);
  });

  it("lista evento com claim preso além do prazo, para o job periódico poder reivindicar de novo", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    await admin.query(
      "UPDATE curation_jobs SET claimed_at = now() - interval '1 hour' WHERE event_id = $1",
      [dados.a.eventoId],
    );

    const eventos = await listEventsWithPendingCuration(admin, 100, 600);
    expect(eventos).toContain(dados.a.eventoId);
  });
});

describe("isolamento por evento", () => {
  it("job do evento A não é visível sob SET LOCAL do evento B", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    const sobB = await comEvento(app, dados.b.eventoId, (c) => claimCurationJobs(c, dados.b.eventoId));
    expect(sobB).toHaveLength(0);

    const sobA = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    expect(sobA).toHaveLength(1);
  });

  it("score de mídia do evento A não é visível sob SET LOCAL do evento B", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      saveCurationScores(c, {
        uploadId: dados.a.uploadId,
        eventId: dados.a.eventoId,
        perceptualHash: "abc123",
        sharpness: 100,
        exposure: 0.1,
      }),
    );

    const sobB = await comEvento(app, dados.b.eventoId, (c) => listCurationScores(c, dados.b.eventoId));
    expect(sobB).toHaveLength(0);

    const sobA = await comEvento(app, dados.a.eventoId, (c) => listCurationScores(c, dados.a.eventoId));
    expect(sobA.map((s) => s.uploadId)).toContain(dados.a.uploadId);
  });
});

describe("saveCurationScores", () => {
  it("aceita score NULL sem erro — sinal ausente, nunca sinal ruim", async () => {
    await expect(
      comEvento(app, dados.a.eventoId, (c) =>
        saveCurationScores(c, {
          uploadId: dados.a.uploadId,
          eventId: dados.a.eventoId,
          perceptualHash: null,
          sharpness: null,
          exposure: null,
        }),
      ),
    ).resolves.toBeUndefined();

    const [linha] = await comEvento(app, dados.a.eventoId, (c) => listCurationScores(c, dados.a.eventoId));
    expect(linha).toEqual({
      uploadId: dados.a.uploadId,
      hash: null,
      sharpness: null,
      exposure: null,
    });
  });

  it("upsert por upload_id — segunda chamada substitui a primeira, não duplica", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      saveCurationScores(c, {
        uploadId: dados.a.uploadId,
        eventId: dados.a.eventoId,
        perceptualHash: "primeiro",
        sharpness: 10,
        exposure: 0.5,
      }),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      saveCurationScores(c, {
        uploadId: dados.a.uploadId,
        eventId: dados.a.eventoId,
        perceptualHash: "segundo",
        sharpness: 20,
        exposure: 0.2,
      }),
    );

    const linhas = await comEvento(app, dados.a.eventoId, (c) => listCurationScores(c, dados.a.eventoId));
    expect(linhas).toHaveLength(1);
    expect(linhas[0]!.hash).toBe("segundo");
  });
});

describe("listUploadsAwaitingCurationScore", () => {
  it("lista mídia publicada sem score, e para de listar depois que o score é salvo", async () => {
    const uploadId = await criarUpload(dados.a.eventoId, dados.a.sessaoId);

    const antes = await comEvento(app, dados.a.eventoId, (c) =>
      listUploadsAwaitingCurationScore(c, dados.a.eventoId, 10),
    );
    expect(antes.map((u) => u.uploadId)).toContain(uploadId);

    await comEvento(app, dados.a.eventoId, (c) =>
      saveCurationScores(c, {
        uploadId,
        eventId: dados.a.eventoId,
        perceptualHash: null,
        sharpness: null,
        exposure: null,
      }),
    );

    const depois = await comEvento(app, dados.a.eventoId, (c) =>
      listUploadsAwaitingCurationScore(c, dados.a.eventoId, 10),
    );
    expect(depois.map((u) => u.uploadId)).not.toContain(uploadId);
  });
});

describe("listEventsNeedingCurationEnqueue — gatilho que alimenta a fila (achado 1)", () => {
  it("lista evento encerrado (ends_at no passado) que ainda não tem curation_jobs", async () => {
    const eventoId = await criarEventoComEndsAt(dados.a.contaId, new Date(Date.now() - 3_600_000));

    const pendentes = await listEventsNeedingCurationEnqueue(admin, 100);

    expect(pendentes).toContain(eventoId);
  });

  it("NÃO lista evento em andamento (ends_at no futuro)", async () => {
    const eventoId = await criarEventoComEndsAt(dados.a.contaId, new Date(Date.now() + 3_600_000));

    const pendentes = await listEventsNeedingCurationEnqueue(admin, 100);

    expect(pendentes).not.toContain(eventoId);
  });

  it("NÃO lista evento encerrado que já tem curation_jobs — enfileirar de novo não duplica", async () => {
    const eventoId = await criarEventoComEndsAt(dados.a.contaId, new Date(Date.now() - 3_600_000));
    await comEvento(app, eventoId, (c) => enqueueCuration(c, eventoId));

    const pendentes = await listEventsNeedingCurationEnqueue(admin, 100);

    expect(pendentes).not.toContain(eventoId);
  });

  it("round-trip: listar + enfileirar alimenta curation_jobs de verdade, e a segunda varredura não reenfileira", async () => {
    const eventoId = await criarEventoComEndsAt(dados.a.contaId, new Date(Date.now() - 3_600_000));

    const pendentes = await listEventsNeedingCurationEnqueue(admin, 100);
    expect(pendentes).toContain(eventoId);

    for (const id of pendentes) {
      await comEvento(app, id, (c) => enqueueCuration(c, id));
    }

    expect(await statusDoJob(eventoId)).toBe("pending");

    const segundaVarredura = await listEventsNeedingCurationEnqueue(admin, 100);
    expect(segundaVarredura).not.toContain(eventoId);
  });
});
