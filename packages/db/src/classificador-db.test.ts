import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  gravarVeredictoUpload,
  listarUploadsPendentesDeClassificacao,
} from "./classificador-db";
import { comEvento } from "./event";
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

describe("pendentes de classificação", () => {
  it("lista só o nulo do evento do crachá", async () => {
    await admin.query("UPDATE uploads SET classifier_verdict = 'limpo' WHERE id = $1", [
      dados.b.uploadId,
    ]);

    const pendentes = await comEvento(app, dados.a.eventoId, (c) =>
      listarUploadsPendentesDeClassificacao(c, dados.a.eventoId),
    );

    expect(pendentes.map((p) => p.id)).toContain(dados.a.uploadId);
    expect(pendentes.map((p) => p.id)).not.toContain(dados.b.uploadId);
  });

  it("grava uma vez e some da fila", async () => {
    const gravou = await comEvento(app, dados.a.eventoId, (c) =>
      gravarVeredictoUpload(c, dados.a.uploadId, "limpo"),
    );
    expect(gravou).toBe(true);

    const deNovo = await comEvento(app, dados.a.eventoId, (c) =>
      gravarVeredictoUpload(c, dados.a.uploadId, "suspeito"),
    );
    expect(deNovo).toBe(false);

    const pendentes = await comEvento(app, dados.a.eventoId, (c) =>
      listarUploadsPendentesDeClassificacao(c, dados.a.eventoId),
    );
    expect(pendentes.map((p) => p.id)).not.toContain(dados.a.uploadId);

    const { rows } = await admin.query<{ classifier_verdict: string }>(
      "SELECT classifier_verdict FROM uploads WHERE id = $1",
      [dados.a.uploadId],
    );
    expect(rows[0]?.classifier_verdict).toBe("limpo");
  });
});
