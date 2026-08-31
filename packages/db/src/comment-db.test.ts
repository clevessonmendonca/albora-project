import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gravarComentario, listarComentariosDaFoto, removerComentario } from "./comment-db";
import { comEvento } from "./event";
import { prepararBanco, semear } from "./testes/banco";

/** Contra banco real — RLS escopa ao evento e remoção só alcança o próprio autor; mock de RLS prova que o mock isola. */

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

let outroDeA: string;
let comentarioA: string;
let comentarioB: string;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);

  // Uma segunda sessão no evento A, para provar que ela não apaga o alheio.
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
     VALUES ($1, 'outro-convidado', 'v1', now()) RETURNING id`,
    [dados.a.eventoId],
  );
  outroDeA = rows[0]!.id;

  const doA = await comEvento(app, dados.a.eventoId, (c) =>
    gravarComentario(c, {
      id: randomUUID(),
      eventoId: dados.a.eventoId,
      midiaId: dados.a.uploadId,
      sessaoId: dados.a.sessaoId,
      respostaA: null,
      texto: "a tia Cida rindo antes de derrubar o copo",
    }),
  );
  comentarioA = doA.id;

  const doB = await comEvento(app, dados.b.eventoId, (c) =>
    gravarComentario(c, {
      id: randomUUID(),
      eventoId: dados.b.eventoId,
      midiaId: dados.b.uploadId,
      sessaoId: dados.b.sessaoId,
      respostaA: null,
      texto: "conteúdo da outra festa",
    }),
  );
  comentarioB = doB.id;
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("o comentário lê só o evento do contexto", () => {
  it("devolve o comentário da foto do evento, e nenhum de outro", async () => {
    const doA = await comEvento(app, dados.a.eventoId, (c) =>
      listarComentariosDaFoto(c, dados.a.eventoId, dados.a.uploadId),
    );

    expect(doA.map((k) => k.id)).toContain(comentarioA);
    expect(doA.map((k) => k.id)).not.toContain(comentarioB);
  });

  it("mesmo pedindo a foto do outro evento, a RLS não a entrega", async () => {
    // Passar o par (event_id, upload_id) de B para uma transação escopada em A não pode furar a política — filtro no SQL e RLS concordam, resultado é vazio.
    const cruzado = await comEvento(app, dados.a.eventoId, (c) =>
      listarComentariosDaFoto(c, dados.b.eventoId, dados.b.uploadId),
    );

    expect(cruzado).toHaveLength(0);
  });
});

describe("a remoção só alcança o próprio autor", () => {
  it("outra sessão do mesmo evento não remove o comentário alheio", async () => {
    const removeu = await comEvento(app, dados.a.eventoId, (c) =>
      removerComentario(c, { comentarioId: comentarioA, sessaoId: outroDeA }),
    );
    expect(removeu).toBe(false);

    const aindaLa = await comEvento(app, dados.a.eventoId, (c) =>
      listarComentariosDaFoto(c, dados.a.eventoId, dados.a.uploadId),
    );
    expect(aindaLa.map((k) => k.id)).toContain(comentarioA);
  });

  it("o autor remove o próprio, e ele some da lista", async () => {
    const removeu = await comEvento(app, dados.a.eventoId, (c) =>
      removerComentario(c, { comentarioId: comentarioA, sessaoId: dados.a.sessaoId }),
    );
    expect(removeu).toBe(true);

    const depois = await comEvento(app, dados.a.eventoId, (c) =>
      listarComentariosDaFoto(c, dados.a.eventoId, dados.a.uploadId),
    );
    expect(depois.map((k) => k.id)).not.toContain(comentarioA);
  });
});
