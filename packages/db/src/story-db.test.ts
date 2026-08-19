import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { criarStory, storiesAtivasDoEvento } from "./story-db";
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

describe("story a partir de um upload confirmado", () => {
  it("cria e aparece na listagem ativa do próprio evento", async () => {
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    expect(criada?.criada).toBe(true);

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    expect(ativas).toHaveLength(1);
    expect(ativas[0]?.uploadId).toBe(dados.a.uploadId);
    expect(ativas[0]?.autor).toBe("convidado-evento-a");
  });

  it("criar duas vezes com o mesmo upload não duplica — idempotência do retry da fila", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    const segunda = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    expect(segunda?.criada).toBe(false);

    const { rows } = await admin.query("SELECT count(*)::int AS total FROM story WHERE upload_id = $1", [
      dados.a.uploadId,
    ]);
    expect(rows[0].total).toBe(1);
  });

  it("upload de outro evento não vira story — nem por RLS, nem pela checagem explícita", async () => {
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.b.uploadId,
      }),
    );
    expect(criada).toBeNull();

    const { rows } = await admin.query("SELECT count(*)::int AS total FROM story WHERE upload_id = $1", [
      dados.b.uploadId,
    ]);
    expect(rows[0].total).toBe(0);
  });

  it("story de outro evento não vaza para a listagem, mesmo com o event_id errado no parâmetro", async () => {
    await comEvento(app, dados.b.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.b.eventoId,
        sessaoId: dados.b.sessaoId,
        uploadId: dados.b.uploadId,
      }),
    );

    // Conectado sob app.event_id = A: pedir a listagem passando o eventoId de
    // B no parâmetro não deveria devolver nada — a RLS decide pela conexão,
    // não pelo argumento da função. Prova que a segunda camada (WHERE) não é
    // a única, e que a primeira (RLS) fecha mesmo se a segunda falhar.
    const comParametroErrado = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.b.eventoId),
    );
    expect(comParametroErrado).toHaveLength(0);

    const doProprioEvento = await comEvento(app, dados.b.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.b.eventoId),
    );
    expect(doProprioEvento).toHaveLength(1);
    expect(doProprioEvento[0]?.uploadId).toBe(dados.b.uploadId);
  });

  it("story vencida some da listagem sem precisar de job de delete", async () => {
    const criada = await comEvento(app, dados.a.eventoId, (c) =>
      criarStory(c, {
        eventoId: dados.a.eventoId,
        sessaoId: dados.a.sessaoId,
        uploadId: dados.a.uploadId,
      }),
    );
    expect(criada).not.toBeNull();

    await admin.query("UPDATE story SET expira_em = now() - interval '1 minute' WHERE id = $1", [
      criada!.id,
    ]);

    const ativas = await comEvento(app, dados.a.eventoId, (c) =>
      storiesAtivasDoEvento(c, dados.a.eventoId),
    );
    expect(ativas.find((s) => s.id === criada!.id)).toBeUndefined();

    const { rows } = await admin.query("SELECT 1 FROM story WHERE id = $1", [criada!.id]);
    expect(rows).toHaveLength(1);
  });
});
