import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarEvento, resolverSlug } from "./events";
import { publicarEvento } from "./moderation-event";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

async function criarEventoComStatus(status: "draft" | "active" | "ended", slug: string) {
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
     VALUES ($1, 'pack-um', $2, now() - interval '1 hour', now() + interval '5 hours', $3)
     RETURNING id`,
    [dados.a.contaId, slug, status],
  );
  const eventoId = rows[0]!.id;
  await admin.query("INSERT INTO event_slugs (slug, event_id) VALUES ($1, $2)", [slug, eventoId]);
  return eventoId;
}

describe("status do evento (task 6 — draft/publish gate)", () => {
  it("evento com status draft resolve como rascunho, mesmo dentro da janela de horário", async () => {
    const eventoId = await criarEventoComStatus("draft", "meu-evento-rascunho");

    const r = await resolverSlug(app, "meu-evento-rascunho", new Date());

    expect(r.estado).toBe("rascunho");
    expect(r.estado !== "desconhecido" && r.evento.eventoId).toBe(eventoId);
  });

  it("evento com status active dentro do horário resolve como aberto", async () => {
    const eventoId = await criarEventoComStatus("active", "evento-ativo-status");

    const r = await resolverSlug(app, "evento-ativo-status", new Date());

    expect(r.estado).toBe("aberto");
    expect(r.estado !== "desconhecido" && r.evento.eventoId).toBe(eventoId);
  });

  it("rascunho vence a janela de horário — evento draft que já 'começou' continua rascunho", async () => {
    // O evento em si está dentro do intervalo starts_at/ends_at; sem
    // publicação, isso não deveria importar.
    await criarEventoComStatus("draft", "rascunho-no-horario");

    const r = await resolverSlug(app, "rascunho-no-horario", new Date());

    expect(r.estado).toBe("rascunho");
  });

  it("eventos semeados por semear() (sem status explícito na chamada) continuam publicados", async () => {
    // Guarda de regressão: sem status='active' explícito em semear(), o
    // DEFAULT 'draft' da migration 0056 quebraria a suíte inteira.
    const r = await resolverSlug(app, "evento-a", new Date());
    expect(r.estado).toBe("aberto");
  });
});

describe("ciclo de vida rascunho → publicado (task 6, gap I1)", () => {
  it("criarEvento nasce em rascunho, e publicarEvento abre pro convidado", async () => {
    const { eventoId, slug } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: new Date(Date.now() - 3600_000),
      terminaEm: new Date(Date.now() + 3600_000),
    });

    expect((await resolverSlug(app, slug, new Date())).estado).toBe("rascunho");

    const publicado = await publicarEvento(app, dados.a.contaId, eventoId);
    expect(publicado?.status).toBe("active");

    const r = await resolverSlug(app, slug, new Date());
    expect(r.estado).toBe("aberto");
    expect(r.estado !== "desconhecido" && r.evento.eventoId).toBe(eventoId);
  });

  it("publicarEvento é idempotente e não devolve o evento pra rascunho", async () => {
    const { eventoId, slug } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: new Date(Date.now() - 3600_000),
      terminaEm: new Date(Date.now() + 3600_000),
    });

    await publicarEvento(app, dados.a.contaId, eventoId);
    const segunda = await publicarEvento(app, dados.a.contaId, eventoId);

    expect(segunda?.status).toBe("active");
    expect((await resolverSlug(app, slug, new Date())).estado).toBe("aberto");
  });

  it("publicarEvento de outra conta não muda nada — a política de conta barra", async () => {
    const { eventoId, slug } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: new Date(Date.now() - 3600_000),
      terminaEm: new Date(Date.now() + 3600_000),
    });

    const resultado = await publicarEvento(app, dados.b.contaId, eventoId);

    expect(resultado).toBeNull();
    expect((await resolverSlug(app, slug, new Date())).estado).toBe("rascunho");
  });
});
