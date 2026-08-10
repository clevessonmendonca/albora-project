import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./evento";
import { prepararBanco, semear } from "./testes/banco";
import { confirmarUpload, ErroUploadDeOutroEvento } from "./uploads";

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

describe("a chave gravada pertence ao evento", () => {
  it("o prefixo da chave carrega o event_id do contexto", async () => {
    const uploadId = randomUUID();

    const r = await comEvento(app, dados.a.eventoId, (c) =>
      confirmarUpload(c, entrada(uploadId, dados.a)),
    );

    expect(r.upload.storageKey.startsWith(`events/${dados.a.eventoId}/`)).toBe(true);
  });
});
