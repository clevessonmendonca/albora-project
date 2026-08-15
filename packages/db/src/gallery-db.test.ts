import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { listarMinhasDoEvento } from "./gallery-db";
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

describe("galeria pessoal", () => {
  it("lista só as fotos da sessão", async () => {
    const minhas = await comEvento(app, dados.a.eventoId, (c) =>
      listarMinhasDoEvento(c, dados.a.sessaoId),
    );
    expect(minhas.some((m) => m.id === dados.a.uploadId)).toBe(true);
    expect(minhas.every((m) => m.chaveThumb.endsWith("/thumb"))).toBe(true);
  });

  it("não inclui foto removida", async () => {
    await admin.query("UPDATE uploads SET state = 'removed' WHERE id = $1", [dados.a.uploadId]);
    try {
      const minhas = await comEvento(app, dados.a.eventoId, (c) =>
        listarMinhasDoEvento(c, dados.a.sessaoId),
      );
      expect(minhas.some((m) => m.id === dados.a.uploadId)).toBe(false);
    } finally {
      await admin.query("UPDATE uploads SET state = 'published' WHERE id = $1", [dados.a.uploadId]);
    }
  });

  it("sessão alheia não vê as fotos de outra", async () => {
    const minhas = await comEvento(app, dados.a.eventoId, (c) =>
      listarMinhasDoEvento(c, dados.b.sessaoId),
    );
    expect(minhas.some((m) => m.id === dados.a.uploadId)).toBe(false);
  });

  it("classificador nulo ou mudo continua visível — a galeria falha aberta", async () => {
    await admin.query("UPDATE uploads SET classifier_verdict = 'sem-resposta' WHERE id = $1", [
      dados.a.uploadId,
    ]);
    const minhas = await comEvento(app, dados.a.eventoId, (c) =>
      listarMinhasDoEvento(c, dados.a.sessaoId),
    );
    expect(minhas.some((m) => m.id === dados.a.uploadId)).toBe(true);
  });
});
