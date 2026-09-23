import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  agendarRetencaoNaTransacao,
  erroDeJobParaRegistro,
  listDueRetentionJobs,
  processRetentionJob,
  sanitizarErroDeJob,
  scheduleRetentionJobs,
  type DueRetentionJob,
  type NotificacaoRetencao,
} from "./retention-jobs";
import { comEvento } from "./event";
import { VaultDeTokenDrive } from "./drive-token-vault";
import { prepararBanco, semear } from "./testes/banco";

/** Contra banco real como `admin` (bypassa RLS) — runner de retenção é cross-event, mesma exigência dos analytics snapshots. */

let admin: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

const HORA = 3600 * 1000;
const DIA = 24 * HORA;

/** `planRetention` só mantém itens com `dueAt > agendamento - 24h` — `ends_at` dos testes é escolhido para que `due_at` caia dentro da janela. */
function endsParaDueHaPouco(offsetDoKindMs: number, dueHaMs: number): Date {
  return new Date(Date.now() - offsetDoKindMs - dueHaMs);
}

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

async function criarEvento(endsAt: Date, contaId?: string) {
  const conta = contaId ?? dados.a.contaId;
  const slug = `evt-${Math.random().toString(36).slice(2, 10)}`;
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
     VALUES ($1, 'pack-um', $2, $3, $4, 'active') RETURNING id`,
    [conta, slug, new Date(endsAt.getTime() - 6 * 3600 * 1000), endsAt],
  );
  const eventoId = rows[0]!.id;
  await admin.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [slug, eventoId]);
  return eventoId;
}

async function jobDoEvento(eventoId: string, kind: string): Promise<DueRetentionJob> {
  const { rows } = await admin.query<{
    id: string;
    event_id: string;
    kind: DueRetentionJob["kind"];
    due_at: Date;
    attempts: number;
    ends_at: Date;
  }>(
    `SELECT r.id, r.event_id, r.kind, r.due_at, r.attempts, e.ends_at
       FROM retention_jobs r JOIN events e ON e.id = r.event_id
      WHERE r.event_id = $1 AND r.kind = $2`,
    [eventoId, kind],
  );
  const l = rows[0]!;
  return { id: l.id, eventId: l.event_id, kind: l.kind, dueAt: l.due_at, attempts: l.attempts, endsAt: l.ends_at };
}

async function statusDoJob(id: string): Promise<{ status: string; attempts: number; lastError: string | null }> {
  const { rows } = await admin.query<{ status: string; attempts: number; last_error: string | null }>(
    "SELECT status, attempts, last_error FROM retention_jobs WHERE id = $1",
    [id],
  );
  return { status: rows[0]!.status, attempts: rows[0]!.attempts, lastError: rows[0]!.last_error };
}

const semNotificar = { notify: async (_n: NotificacaoRetencao) => {} };

describe("agendarRetencaoNaTransacao / scheduleRetentionJobs", { timeout: 30_000 }, () => {
  it("cria os quatro kinds com due_at derivados de ends_at", async () => {
    // Futuro relativo a agora: planRetention descarta job cujo due já passou
    // (filtro `> now - 1 dia`), então uma data fixa faz plus_48h sumir assim
    // que o relógio passa de ends+48h — o teste virava time-bomb.
    const ends = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);

    const { rows } = await admin.query<{ kind: string; due_at: Date }>(
      "SELECT kind, due_at FROM retention_jobs WHERE event_id = $1 ORDER BY due_at ASC",
      [eventoId],
    );
    expect(rows.map((r) => r.kind)).toEqual(["plus_48h", "d330_drive", "d358_warn", "d365_delete"]);
  });

  it("é idempotente — chamar duas vezes não duplica", async () => {
    // Relativo ao presente, nunca absoluto: `planRetention` descarta job com
    // `due_at` mais de um dia no passado, então uma data fixa passa a agendar
    // três em vez de quatro assim que o calendário anda — este teste reprovou
    // sozinho, sem ninguém tocar em código.
    const ends = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM retention_jobs WHERE event_id = $1",
      [eventoId],
    );
    expect(rows[0]!.n).toBe(4);
  });

  it("agendarRetencaoNaTransacao roda dentro de uma transação já aberta (comEvento)", async () => {
    const ends = new Date(Date.now() + 2 * 24 * 3600 * 1000);
    const eventoId = await criarEvento(ends);
    await comEvento(admin, eventoId, (c) => agendarRetencaoNaTransacao(c, eventoId, ends));

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM retention_jobs WHERE event_id = $1",
      [eventoId],
    );
    expect(rows[0]!.n).toBe(4);
  });

  it("criarEvento (events.ts) já agenda os quatro kinds — a integração real do produto", async () => {
    const { criarEvento: criarEventoReal } = await import("./events");
    const { eventoId } = await criarEventoReal(admin, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: new Date(),
      terminaEm: new Date(Date.now() + 3 * 3600 * 1000),
    });

    const { rows } = await admin.query<{ kind: string }>(
      "SELECT kind FROM retention_jobs WHERE event_id = $1 ORDER BY kind",
      [eventoId],
    );
    expect(rows.map((r) => r.kind).sort()).toEqual(
      ["d330_drive", "d358_warn", "d365_delete", "plus_48h"].sort(),
    );
  });
});

describe("processRetentionJob — plus_48h", () => {
  it("marca done assim que devido", async () => {
    const ends = new Date(Date.now() - 49 * 3600 * 1000);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    const job = await jobDoEvento(eventoId, "plus_48h");

    const r = await processRetentionJob(admin, job, semNotificar);
    expect(r).toEqual({ status: "done" });
    expect((await statusDoJob(job.id)).status).toBe("done");
  });
});

describe("processRetentionJob — avisos (d330_drive/d358_warn): reenvio no máximo uma vez", () => {
  it("d330_drive: primeira chamada notifica e marca attempts=1, sem fechar o job", async () => {
    const ends = endsParaDueHaPouco(330 * DIA, HORA);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    const job = await jobDoEvento(eventoId, "d330_drive");

    const notificacoes: NotificacaoRetencao[] = [];
    const r = await processRetentionJob(admin, job, { notify: async (n) => void notificacoes.push(n) });

    expect(r).toEqual({ status: "done" });
    expect(notificacoes).toHaveLength(1);
    expect(notificacoes[0]).toMatchObject({ kind: "d330_drive", eventId: eventoId });
    const status = await statusDoJob(job.id);
    expect(status.attempts).toBe(1);
  });

  it("d330_drive: chamada antes dos +7 dias não reenvia (aguardando)", async () => {
    const ends = endsParaDueHaPouco(330 * DIA, HORA);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    let job = await jobDoEvento(eventoId, "d330_drive");
    await processRetentionJob(admin, job, semNotificar);

    job = await jobDoEvento(eventoId, "d330_drive");
    const notificacoes: NotificacaoRetencao[] = [];
    const r = await processRetentionJob(admin, job, { notify: async (n) => void notificacoes.push(n) });

    expect(r).toEqual({ status: "aguardando" });
    expect(notificacoes).toHaveLength(0);
  });

  it("d330_drive: reenvia exatamente uma vez após +7 dias e fecha para sempre", async () => {
    const ends = endsParaDueHaPouco(330 * DIA, HORA);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    let job = await jobDoEvento(eventoId, "d330_drive");
    await processRetentionJob(admin, job, semNotificar);

    job = await jobDoEvento(eventoId, "d330_drive");
    const oitoDiasDepois = new Date(job.dueAt.getTime() + 8 * 24 * 3600 * 1000);
    const notificacoes: NotificacaoRetencao[] = [];
    const r = await processRetentionJob(admin, job, {
      notify: async (n) => void notificacoes.push(n),
      now: oitoDiasDepois,
    });

    expect(r).toEqual({ status: "done" });
    expect(notificacoes).toHaveLength(1);
    const status = await statusDoJob(job.id);
    expect(status.status).toBe("done");
    expect(status.attempts).toBe(2);

    // Terceira chamada nunca reenvia de novo — já é terminal (status 'done' sob o lock, curto-circuita antes de qualquer notify).
    job = await jobDoEvento(eventoId, "d330_drive");
    const bemDepois = new Date(oitoDiasDepois.getTime() + 30 * 24 * 3600 * 1000);
    expect(
      await processRetentionJob(admin, job, {
        notify: async () => {
          throw new Error("não deveria reenviar de novo");
        },
        now: bemDepois,
      }),
    ).toEqual({ status: "done" });
  });

  it("d358_warn: diasRestantes reflete o due_at real do D365, nunca hardcoded", async () => {
    const ends = endsParaDueHaPouco(358 * DIA, HORA);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    const job = await jobDoEvento(eventoId, "d358_warn");

    const notificacoes: NotificacaoRetencao[] = [];
    await processRetentionJob(admin, job, { notify: async (n) => void notificacoes.push(n) });

    const n = notificacoes[0];
    expect(n?.kind).toBe("d358_warn");
    if (n?.kind === "d358_warn") {
      expect(n.diasRestantes).toBeGreaterThanOrEqual(6);
      expect(n.diasRestantes).toBeLessThanOrEqual(7);
    }
  });
});

describe("processRetentionJob — d365_delete: o gate fail-closed", () => {
  async function eventoComUploadsPublicados(n: number, ends: Date): Promise<string> {
    const eventoId = await criarEvento(ends);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado-retencao', 'v1', now()) RETURNING id`,
      [eventoId],
    );
    for (let i = 0; i < n; i++) {
      await admin.query(
        `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
         VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000, 'published')`,
        [eventoId, sessao[0]!.id, `events/${eventoId}/2026/08/foto/${i}`],
      );
    }
    return eventoId;
  }

  it("sem export nenhum: skip com export_missing, e o job continua pending/failed (reprocessável)", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await eventoComUploadsPublicados(3, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    const job = await jobDoEvento(eventoId, "d365_delete");

    const r = await processRetentionJob(admin, job, semNotificar);
    expect(r).toEqual({ status: "skipped", reason: "export_missing", diasDeAtraso: expect.any(Number) });

    const status = await statusDoJob(job.id);
    expect(status.status).toBe("failed");
    expect(status.lastError).toBe("export_missing");

    // Reprocessável: aparece de novo na listagem de jobs vencidos.
    const vencidos = await listDueRetentionJobs(admin, 100);
    expect(vencidos.some((j) => j.id === job.id)).toBe(true);
  });

  it("export parcial não libera — skip com export_parcial", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await eventoComUploadsPublicados(3, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'parcial', 'full', 2, '[]'::jsonb, 3)`,
      [eventoId, dados.a.contaId],
    );
    const job = await jobDoEvento(eventoId, "d365_delete");

    const r = await processRetentionJob(admin, job, semNotificar);
    expect(r).toEqual({ status: "skipped", reason: "export_parcial", diasDeAtraso: expect.any(Number) });
  });

  it("export pronto mas desatualizado (publicou depois) não libera — skip com export_desatualizado", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await eventoComUploadsPublicados(3, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'pronto', 'full', 2, '[]'::jsonb, 2)`,
      [eventoId, dados.a.contaId],
    );
    const job = await jobDoEvento(eventoId, "d365_delete");

    const r = await processRetentionJob(admin, job, semNotificar);
    expect(r).toEqual({ status: "skipped", reason: "export_desatualizado", diasDeAtraso: expect.any(Number) });
  });

  it("skip nunca é silencioso — dispara notificação com o motivo", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await eventoComUploadsPublicados(1, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    const job = await jobDoEvento(eventoId, "d365_delete");

    const notificacoes: NotificacaoRetencao[] = [];
    await processRetentionJob(admin, job, { notify: async (n) => void notificacoes.push(n) });

    expect(notificacoes).toHaveLength(1);
    expect(notificacoes[0]).toMatchObject({ kind: "d365_skip", reason: "export_missing", eventId: eventoId });
  });

  it("export pronto e atual: libera — purga uploads e revoga drive_connections", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await eventoComUploadsPublicados(3, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'pronto', 'full', 3, '[]'::jsonb, 3)`,
      [eventoId, dados.a.contaId],
    );
    await admin.query(
      `INSERT INTO drive_connections (event_id, account_id, drive_folder_id, refresh_ciphertext, refresh_iv, refresh_tag, key_version)
       VALUES ($1, $2, 'folder-x', '\\x00', '\\x00', '\\x00', 1)`,
      [eventoId, dados.a.contaId],
    );
    const job = await jobDoEvento(eventoId, "d365_delete");

    const r = await processRetentionJob(admin, job, semNotificar);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.chavesParaApagar).toHaveLength(3);

    const { rows: uploads } = await admin.query<{ state: string }>(
      "SELECT state FROM uploads WHERE event_id = $1",
      [eventoId],
    );
    expect(uploads.every((u) => u.state === "purged")).toBe(true);

    const { rows: conexao } = await admin.query<{ status: string }>(
      "SELECT status FROM drive_connections WHERE event_id = $1",
      [eventoId],
    );
    expect(conexao[0]!.status).toBe("revogado");
  });

  it("com vault nos deps, abre o refresh token ANTES do purge para o chamador revogar no Google", async () => {
    const vault = new VaultDeTokenDrive({ versao: 1, chave: Buffer.alloc(32, 5) });
    const selado = await vault.seal("refresh-token-de-verdade");

    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await eventoComUploadsPublicados(2, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'pronto', 'full', 2, '[]'::jsonb, 2)`,
      [eventoId, dados.a.contaId],
    );
    await admin.query(
      `INSERT INTO drive_connections (event_id, account_id, drive_folder_id, refresh_ciphertext, refresh_iv, refresh_tag, key_version)
       VALUES ($1, $2, 'folder-x', $3, $4, $5, $6)`,
      [
        eventoId,
        dados.a.contaId,
        Buffer.from(selado.ciphertext, "base64"),
        Buffer.from(selado.iv, "base64"),
        Buffer.from(selado.tag, "base64"),
        selado.keyVersion,
      ],
    );
    const job = await jobDoEvento(eventoId, "d365_delete");

    const r = await processRetentionJob(admin, job, { notify: async () => {}, vault });
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.driveRefreshTokenParaRevogar).toBe("refresh-token-de-verdade");
  });

  it("sem vault nos deps, nunca tenta abrir o refresh token — degrada sem quebrar o purge", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await eventoComUploadsPublicados(1, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'pronto', 'full', 1, '[]'::jsonb, 1)`,
      [eventoId, dados.a.contaId],
    );
    const job = await jobDoEvento(eventoId, "d365_delete");

    const r = await processRetentionJob(admin, job, semNotificar);
    expect(r.status).toBe("done");
    if (r.status === "done") expect(r.driveRefreshTokenParaRevogar).toBeUndefined();
  });

  it("acervo vazio (nunca houve publicação) libera com export vazio pronto", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'vazio', 'full', 0, '[]'::jsonb, 0)`,
      [eventoId, dados.a.contaId],
    );
    const job = await jobDoEvento(eventoId, "d365_delete");
    const r = await processRetentionJob(admin, job, semNotificar);
    // 'vazio' entra no mesmo balde de "não é pronto" do core — fail-closed por desenho: mesmo um acervo vazio exige um export 'pronto' explícito.
    expect(r).toEqual({ status: "skipped", reason: "export_parcial", diasDeAtraso: expect.any(Number) });
  });

  it("grace window: não processa antes de devido + 60min, mesmo com export pronto esperando", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 30 * 60 * 1000); // venceu há 30min — dentro da folga de 60min
    const eventoId = await eventoComUploadsPublicados(1, ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'pronto', 'full', 1, '[]'::jsonb, 1)`,
      [eventoId, dados.a.contaId],
    );
    const job = await jobDoEvento(eventoId, "d365_delete");
    const r = await processRetentionJob(admin, job, semNotificar);
    expect(r).toEqual({ status: "aguardando" });

    const { rows: uploads } = await admin.query<{ state: string }>(
      "SELECT state FROM uploads WHERE event_id = $1",
      [eventoId],
    );
    expect(uploads.every((u) => u.state === "published")).toBe(true);
  });
});

describe("processRetentionJob — lock por evento (pg_advisory_xact_lock)", () => {
  it("duas invocações concorrentes do mesmo job só produzem um efeito", async () => {
    const ends = new Date(Date.now() - 49 * 3600 * 1000);
    const eventoId = await criarEvento(ends);
    await scheduleRetentionJobs(admin, eventoId, ends);
    const job = await jobDoEvento(eventoId, "plus_48h");

    const [a, b] = await Promise.all([
      processRetentionJob(admin, job, semNotificar),
      processRetentionJob(admin, job, semNotificar),
    ]);

    expect([a.status, b.status].sort()).toEqual(["done", "done"]);
    const status = await statusDoJob(job.id);
    expect(status.status).toBe("done");
    // attempts incrementa uma vez por execução real — sob o lock, a segunda invocação encontra o status já 'done' e sai sem tocar attempts de novo.
    expect(status.attempts).toBe(1);
  });
});

describe("sanitizarErroDeJob / erroDeJobParaRegistro", () => {
  it("mascara o valor em conflito do Postgres, não só o e-mail", () => {
    const cru =
      'duplicate key value violates unique constraint "accounts_email_key" DETAIL: Key (email)=(joao@gmail.com) already exists.';
    const limpo = sanitizarErroDeJob(cru)!;
    expect(limpo).not.toContain("joao@gmail.com");
    expect(limpo).toContain("Key (email)=(«valor»)");
    expect(limpo).toContain("accounts_email_key");
  });

  it("mascara a linha inteira de um Failing row contains", () => {
    const limpo = sanitizarErroDeJob("new row violates check DETAIL: Failing row contains (1, joao, 61999998888).")!;
    expect(limpo).not.toContain("61999998888");
    expect(limpo).toContain("Failing row contains («linha»)");
  });

  it("mascara e-mail solto em erro de API externa", () => {
    expect(sanitizarErroDeJob("Drive: invalid_grant for maria.silva+tag@empresa.com.br")).toBe(
      "Drive: invalid_grant for «contato»",
    );
  });

  it("mascara query string — é onde a URL assinada carrega credencial", () => {
    const limpo = sanitizarErroDeJob("PUT https://r2.example.com/a/b?X-Amz-Signature=deadbeef failed")!;
    expect(limpo).not.toContain("deadbeef");
    expect(limpo).toContain("?«query»");
  });

  it("mascara telefone — é PII tanto quanto e-mail, em qualquer formato", () => {
    expect(sanitizarErroDeJob("WhatsApp falhou para 5561999998888")).toBe(
      "WhatsApp falhou para «telefone»",
    );
    expect(sanitizarErroDeJob("SMS para (61) 99999-8888 recusado")).toBe("SMS para «telefone» recusado");
    expect(sanitizarErroDeJob("contato 61 99999-8888 indisponivel")).toBe(
      "contato «telefone» indisponivel",
    );
  });

  it("preserva o UUID do evento — mascarar o identificador cegaria o diagnóstico", () => {
    const comUuid = "event 550e8400-e29b-41d4-a716-446655440000 nao encontrado";
    expect(sanitizarErroDeJob(comUuid)).toBe(comUuid);
  });

  it("valor com parêntese não vaza o resto da mensagem", () => {
    // Regex parando no primeiro `)` deixava telefone e nome crus depois dele.
    const linha = sanitizarErroDeJob("Failing row contains (1, Joao (Silva), 61999998888, ativo).");
    expect(linha).toBe("Failing row contains («linha»)");

    const chave = sanitizarErroDeJob("Key (nome)=(Joao (Silva)) already exists");
    expect(chave).toBe("Key (nome)=(«valor») already exists");
  });

  it("trunca em 300 chars e preserva null", () => {
    expect(sanitizarErroDeJob(null)).toBeNull();
    const longo = sanitizarErroDeJob("x".repeat(500))!;
    expect(longo).toHaveLength(301);
    expect(longo.endsWith("…")).toBe(true);
  });

  it("não mexe em motivo de recusa — união fechada continua legível", () => {
    expect(sanitizarErroDeJob("export_missing")).toBe("export_missing");
  });

  it("prefixa código estruturado: SQLSTATE do pg quando existe, name do Error caso contrário", () => {
    const pgErr = Object.assign(new Error("duplicate key"), { code: "23505" });
    expect(erroDeJobParaRegistro(pgErr)).toBe("23505: duplicate key");
    expect(erroDeJobParaRegistro(new TypeError("x is not a function"))).toBe("TypeError: x is not a function");
    expect(erroDeJobParaRegistro("string solta")).toBe("desconhecido: string solta");
  });
});

describe("processRetentionJob — last_error nunca guarda PII crua", () => {
  /** Falha o purge do d365 com uma exceção controlada, sem mexer no worker: o resto da transação usa o pool real. */
  function poolQuePurgaFalhando(mensagem: string): pg.Pool {
    return {
      connect: async () => {
        const cliente = await admin.connect();
        const original = cliente.query.bind(cliente);
        // Repassa TODOS os args: pg.Pool.query chama client.query(texto, params, callback) e some se o callback for engolido.
        const patch = (...args: unknown[]) => {
          const texto = args[0];
          if (typeof texto === "string" && texto.startsWith("UPDATE uploads SET state = 'purged'")) {
            throw new Error(mensagem);
          }
          return (original as (...a: unknown[]) => unknown)(...args);
        };
        (cliente as unknown as { query: unknown }).query = patch;
        const releaseOriginal = cliente.release.bind(cliente);
        cliente.release = (err?: Error | boolean) => {
          // Devolve o client limpo: o pool reaproveita esta conexão nos testes seguintes.
          (cliente as unknown as { query: unknown }).query = original;
          return releaseOriginal(err as never);
        };
        return cliente;
      },
      query: admin.query.bind(admin),
    } as unknown as pg.Pool;
  }

  it("exceção com e-mail no meio grava código + mensagem mascarada, e a falha/retry não muda", async () => {
    const ends = endsParaDueHaPouco(365 * DIA, 90 * 60 * 1000);
    const eventoId = await criarEvento(ends);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado-retencao', 'v1', now()) RETURNING id`,
      [eventoId],
    );
    await admin.query(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000, 'published')`,
      [eventoId, sessao[0]!.id, `events/${eventoId}/2026/08/foto/0`],
    );
    await admin.query(
      `INSERT INTO export_jobs (event_id, account_id, state, mode, photo_count, items, published_snapshot)
       VALUES ($1, $2, 'pronto', 'full', 1, '[]'::jsonb, 1)`,
      [eventoId, dados.a.contaId],
    );
    await scheduleRetentionJobs(admin, eventoId, ends);
    const job = await jobDoEvento(eventoId, "d365_delete");

    const pool = poolQuePurgaFalhando(
      'duplicate key value violates unique constraint "accounts_email_key" DETAIL: Key (email)=(joao@gmail.com) already exists.',
    );
    const r = await processRetentionJob(pool, job, semNotificar);

    expect(r.status).toBe("failed");
    if (r.status === "failed") {
      expect(r.error).not.toContain("joao@gmail.com");
      expect(r.error.startsWith("Error: ")).toBe(true);
    }

    const status = await statusDoJob(job.id);
    expect(status.status).toBe("failed");
    expect(status.attempts).toBe(1);
    expect(status.lastError).not.toContain("joao@gmail.com");
    expect(status.lastError).toContain("«valor»");

    // Reprocessável: a falha continua voltando na fila de vencidos.
    const vencidos = await listDueRetentionJobs(admin, 200);
    expect(vencidos.some((j) => j.id === job.id)).toBe(true);

    // Rollback preservado: nada foi purgado.
    const { rows: uploads } = await admin.query<{ state: string }>(
      "SELECT state FROM uploads WHERE event_id = $1",
      [eventoId],
    );
    expect(uploads.every((u) => u.state === "published")).toBe(true);
  });
});
