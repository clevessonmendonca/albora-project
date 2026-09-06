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
  reclaimFailedCurationJob,
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
    // Claim sozinho é progresso, não tentativa fracassada (achado 7) — não incrementa.
    expect(resultadoA[0]!.attempts).toBe(0);
  });

  it("attempts NÃO cresce em claims de trabalho saudável — só failCurationJob incrementa (achado 7)", async () => {
    // Cenário do review: backlog maior que o teto de rodadas por passada — o job
    // nunca completa na mesma varredura, fica `processing`, é destravado por
    // `reclaimStaleCurationJob` e reivindicado de novo, várias vezes seguidas.
    // Nenhuma dessas voltas é uma falha; `attempts` tem que continuar em 0.
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    for (let i = 0; i < 5; i++) {
      const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
      expect(job).toBeDefined();
      expect(job!.attempts).toBe(0);
      // Simula a varredura seguinte: job ficou "processing" (backlog não esgotado),
      // claimed_at envelhece além do prazo, o próximo reclaim destrava.
      await admin.query(
        "UPDATE curation_jobs SET claimed_at = now() - interval '1 hour' WHERE event_id = $1",
        [dados.a.eventoId],
      );
      const devolvidos = await comEvento(app, dados.a.eventoId, (c) =>
        reclaimStaleCurationJob(c, dados.a.eventoId, 600),
      );
      expect(devolvidos).toBe(1);
    }

    const { rows } = await admin.query<{ attempts: number }>(
      "SELECT attempts FROM curation_jobs WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.attempts).toBe(0);
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

    // attempts só sobe por falha real (failCurationJob), não por claim — gera um
    // attempts=1 de verdade antes de testar que reclaimStaleCurationJob não o zera.
    const [primeiroJob] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => failCurationJob(c, primeiroJob!.id, 5, "erro de teste"));
    expect(await statusDoJob(dados.a.eventoId)).toBe("pending");

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

describe("reclaimFailedCurationJob — failed não pode ser buraco silencioso (achado 7)", () => {
  it("devolve a pending e zera attempts um failed além da janela de recuperação", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    const resultado = await comEvento(app, dados.a.eventoId, (c) =>
      failCurationJob(c, job!.id, 1, "erro sistêmico de teste"),
    );
    expect(resultado).toBe("failed");
    expect(await statusDoJob(dados.a.eventoId)).toBe("failed");

    await admin.query(
      "UPDATE curation_jobs SET claimed_at = now() - interval '25 hours' WHERE event_id = $1",
      [dados.a.eventoId],
    );

    const devolvidos = await comEvento(app, dados.a.eventoId, (c) =>
      reclaimFailedCurationJob(c, dados.a.eventoId, 86_400),
    );
    expect(devolvidos).toBe(1);
    expect(await statusDoJob(dados.a.eventoId)).toBe("pending");

    const { rows } = await admin.query<{ attempts: number }>(
      "SELECT attempts FROM curation_jobs WHERE event_id = $1",
      [dados.a.eventoId],
    );
    expect(rows[0]!.attempts).toBe(0);

    // Evento não fica morto para sempre: o próximo claim reivindica normalmente.
    const [reivindicado] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    expect(reivindicado).toBeDefined();
  });

  it("NÃO mexe em failed ainda dentro da janela", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => failCurationJob(c, job!.id, 1, "erro sistêmico de teste"));
    expect(await statusDoJob(dados.a.eventoId)).toBe("failed");

    const devolvidos = await comEvento(app, dados.a.eventoId, (c) =>
      reclaimFailedCurationJob(c, dados.a.eventoId, 86_400),
    );
    expect(devolvidos).toBe(0);
    expect(await statusDoJob(dados.a.eventoId)).toBe("failed");
  });

  it("NÃO mexe em pending nem em processing", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    const devolvidosPending = await comEvento(app, dados.a.eventoId, (c) =>
      reclaimFailedCurationJob(c, dados.a.eventoId, 0),
    );
    expect(devolvidosPending).toBe(0);

    await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    const devolvidosProcessing = await comEvento(app, dados.a.eventoId, (c) =>
      reclaimFailedCurationJob(c, dados.a.eventoId, 0),
    );
    expect(devolvidosProcessing).toBe(0);
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

  it("NÃO lista failed recente — achado 7 seria buraco silencioso sem a janela de recuperação", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => failCurationJob(c, job!.id, 1, "erro de teste"));
    expect(await statusDoJob(dados.a.eventoId)).toBe("failed");

    const eventos = await listEventsWithPendingCuration(admin, 100, 600, 86_400);
    expect(eventos).not.toContain(dados.a.eventoId);
  });

  it("lista failed além da janela de recuperação — é isso que dá a failed um caminho de volta (achado 7)", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));
    const [job] = await comEvento(app, dados.a.eventoId, (c) => claimCurationJobs(c, dados.a.eventoId));
    await comEvento(app, dados.a.eventoId, (c) => failCurationJob(c, job!.id, 1, "erro de teste"));
    await admin.query(
      "UPDATE curation_jobs SET claimed_at = now() - interval '25 hours' WHERE event_id = $1",
      [dados.a.eventoId],
    );

    const eventos = await listEventsWithPendingCuration(admin, 100, 600, 86_400);
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

  /**
   * Achado 4 do review: os dois testes acima chamam funções cujo próprio SQL já filtra por
   * `event_id` no `WHERE` — passariam com `USING (true)` (sem RLS nenhuma), porque zero linhas
   * viria do `WHERE`, não da policy. Os testes abaixo consultam SEM `event_id` no `WHERE`: só a
   * policy pode filtrar. `admin` conecta como superuser (ignora RLS mesmo com `FORCE`) — por isso
   * usam `app`, o mesmo pool `albora_app` sem `BYPASSRLS` que `prepararBanco()` describe no
   * comentário do topo do arquivo.
   */
  async function contarSemWhere(
    client: Pick<pg.PoolClient, "query">,
    tabela: "curation_jobs" | "media_curation_scores",
  ): Promise<number> {
    const { rows } = await client.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${tabela}`);
    return rows[0]!.n;
  }

  it("prova a RLS de verdade (não o WHERE): curation_jobs sem filtro na query some sob o evento errado", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    expect(await comEvento(app, dados.b.eventoId, (c) => contarSemWhere(c, "curation_jobs"))).toBe(0);
    expect(await comEvento(app, dados.a.eventoId, (c) => contarSemWhere(c, "curation_jobs"))).toBe(1);
  });

  it("prova a RLS de verdade (não o WHERE): media_curation_scores sem filtro na query some sob o evento errado", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      saveCurationScores(c, {
        uploadId: dados.a.uploadId,
        eventId: dados.a.eventoId,
        perceptualHash: "prova-rls",
        sharpness: 1,
        exposure: 1,
      }),
    );

    expect(
      await comEvento(app, dados.b.eventoId, (c) => contarSemWhere(c, "media_curation_scores")),
    ).toBe(0);
    expect(
      await comEvento(app, dados.a.eventoId, (c) => contarSemWhere(c, "media_curation_scores")),
    ).toBe(1);
  });

  it("prova o NULLIF: sem SET LOCAL (GUC não setado nesta transação), a policy devolve 0 linhas em vez de estourar 'invalid input syntax for type uuid'", async () => {
    await comEvento(app, dados.a.eventoId, (c) => enqueueCuration(c, dados.a.eventoId));

    // Conexão própria, NUNCA passa por comEvento nesta transação — sem `set_config`,
    // current_setting('app.event_id', true) é NULL (ou '', se a conexão do pool já rodou
    // um SET LOCAL antes e o valor "voltou" — CLAUDE.md). Sem o NULLIF, `''::uuid`
    // estouraria; com ele, a comparação vira `event_id = NULL`, que nunca casa.
    const cliente = await app.connect();
    try {
      await cliente.query("BEGIN");
      await expect(contarSemWhere(cliente, "curation_jobs")).resolves.toBe(0);
      await cliente.query("COMMIT");
    } finally {
      cliente.release();
    }
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
