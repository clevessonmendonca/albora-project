import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { prepararBanco, semear } from "./testes/banco";
import { confirmarUpload, ErroUploadDeOutroEvento, removerUploadProprio } from "./uploads";

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

const entrada = (uploadId: string, d: { eventoId: string; sessaoId: string }) => ({
  uploadId,
  eventId: d.eventoId,
  sessionId: d.sessaoId,
  challengeId: null,
  storageKey: `events/${d.eventoId}/2026/08/${uploadId}/full`,
  mime: "image/jpeg",
  bytes: 812_345,
  caption: null,
  place: null,
});

describe("confirm é idempotente sob concorrência", () => {
  it("dois retries do mesmo uploadId ao mesmo tempo dão uma linha, nunca erro", async () => {
    // O caso real: sinal ruim, o cliente retenta antes de a primeira resposta chegar — antes do lock isto dava um sucesso e um 403, que o transporte trata como definitivo e a foto sumia da fila. Achado pelo arnês de carga, não por revisão.
    const uploadId = randomUUID();

    const resultados = await Promise.allSettled([
      comEvento(app, dados.a.eventoId, (c) => confirmarUpload(c, entrada(uploadId, dados.a))),
      comEvento(app, dados.a.eventoId, (c) => confirmarUpload(c, entrada(uploadId, dados.a))),
    ]);

    const { rows } = await admin.query("SELECT count(*)::int AS n FROM uploads WHERE id = $1", [
      uploadId,
    ]);

    expect(resultados.filter((r) => r.status === "rejected")).toEqual([]);
    expect(rows[0].n).toBe(1);
  });

  it("dez retries simultâneos continuam dando uma linha só", async () => {
    const uploadId = randomUUID();

    const resultados = await Promise.allSettled(
      Array.from({ length: 10 }, () =>
        comEvento(app, dados.a.eventoId, (c) => confirmarUpload(c, entrada(uploadId, dados.a))),
      ),
    );

    const { rows } = await admin.query("SELECT count(*)::int AS n FROM uploads WHERE id = $1", [
      uploadId,
    ]);

    expect(resultados.filter((r) => r.status === "rejected")).toEqual([]);
    expect(rows[0].n).toBe(1);
  });
});

describe("confirm é idempotente — retry é o caminho normal", () => {
  it("a segunda chamada devolve a mesma linha, não duplica", async () => {
    const uploadId = randomUUID();

    const primeira = await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, entrada(uploadId, dados.a)),
    );
    const segunda = await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, entrada(uploadId, dados.a)),
    );

    expect(primeira.estado).toBe("criado");
    expect(segunda.estado).toBe("ja_existia");
    expect(segunda.upload.id).toBe(primeira.upload.id);

    const { rows } = await admin.query("SELECT count(*)::int AS n FROM uploads WHERE id = $1", [
      uploadId,
    ]);
    expect(rows[0].n).toBe(1);
  });

  it("três chamadas concorrentes com o mesmo id produzem uma linha só", async () => {
    const uploadId = randomUUID();

    const resultados = await Promise.all(
      [1, 2, 3].map(() =>
        comEvento(app, dados.a.eventoId, (c) => confirmarUpload(c, entrada(uploadId, dados.a))),
      ),
    );

    expect(resultados.filter((r) => r.estado === "criado")).toHaveLength(1);

    const { rows } = await admin.query("SELECT count(*)::int AS n FROM uploads WHERE id = $1", [
      uploadId,
    ]);
    expect(rows[0].n).toBe(1);
  });
});

describe("o uploadId não atravessa eventos", () => {
  it("reusar no evento B um id já confirmado em A é recusado", async () => {
    const uploadId = randomUUID();

    await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, entrada(uploadId, dados.a)),
    );

    await expect(
      comEvento(app, dados.b.eventoId, (c) => confirmarUpload(c, entrada(uploadId, dados.b))),
    ).rejects.toBeInstanceOf(ErroUploadDeOutroEvento);

    // E a linha de A continua intacta: a tentativa de B não escreveu nada.
    const { rows } = await admin.query("SELECT event_id FROM uploads WHERE id = $1", [uploadId]);
    expect(rows[0].event_id).toBe(dados.a.eventoId);
  });

  it("a recusa não distingue 'existe em outro evento' de 'não existe'", async () => {
    const doOutroEvento = randomUUID();
    await comEvento(app, dados.b.eventoId, (c) =>
      confirmarUpload(c, entrada(doOutroEvento, dados.b)),
    );

    const erro = await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, entrada(doOutroEvento, dados.a)),
    ).catch((e) => e);

    // Nada na mensagem revela o outro evento — dizer "já existe lá" já vaza.
    expect(String(erro.message)).not.toContain(dados.b.eventoId);
  });
});

describe("remover a própria foto", () => {
  it("a sessão dona marca como removed", async () => {
    const uploadId = randomUUID();
    await comEvento(app, dados.a.eventoId, (c) => confirmarUpload(c, entrada(uploadId, dados.a)));

    const removido = await comEvento(app, dados.a.eventoId, (c) =>
      removerUploadProprio(c, uploadId, dados.a.sessaoId),
    );
    expect(removido).toBe(true);

    const { rows } = await admin.query("SELECT state FROM uploads WHERE id = $1", [uploadId]);
    expect(rows[0].state).toBe("removed");
  });

  it("sessão alheia não remove", async () => {
    const removido = await comEvento(app, dados.a.eventoId, (c) =>
      removerUploadProprio(c, dados.a.uploadId, dados.b.sessaoId),
    );
    expect(removido).toBe(false);
  });
});

describe("a chave gravada pertence ao evento", () => {
  it("o prefixo da chave carrega o event_id do contexto", async () => {
    const uploadId = randomUUID();

    const r = await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, entrada(uploadId, dados.a)),
    );

    expect(r.upload.storageKey.startsWith(`events/${dados.a.eventoId}/`)).toBe(true);
  });
});

describe("confirm persiste o instante de captura e as dimensões", () => {
  it("grava taken_at, width e height na primeira inserção", async () => {
    const uploadId = randomUUID();
    const capturada = new Date("2026-08-09T01:10:00.000Z");

    const r = await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, {
        ...entrada(uploadId, dados.a),
        takenAt: capturada,
        width: 1080,
        height: 1920,
      }),
    );

    expect(r.estado).toBe("criado");
    expect(r.upload.takenAt?.toISOString()).toBe(capturada.toISOString());
    expect(r.upload.width).toBe(1080);
    expect(r.upload.height).toBe(1920);

    const { rows } = await admin.query(
      "SELECT taken_at, width, height FROM uploads WHERE id = $1",
      [uploadId],
    );
    expect(rows[0].taken_at.toISOString()).toBe(capturada.toISOString());
    expect(rows[0].width).toBe(1080);
    expect(rows[0].height).toBe(1920);
  });

  it("retry não apaga o taken_at que a primeira chamada gravou", async () => {
    const uploadId = randomUUID();
    const capturada = new Date("2026-08-09T02:00:00.000Z");

    await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, {
        ...entrada(uploadId, dados.a),
        takenAt: capturada,
        width: 1080,
        height: 1920,
      }),
    );

    const segunda = await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, entrada(uploadId, dados.a)),
    );

    expect(segunda.estado).toBe("ja_existia");
    expect(segunda.upload.takenAt?.toISOString()).toBe(capturada.toISOString());
    expect(segunda.upload.width).toBe(1080);
  });
});
