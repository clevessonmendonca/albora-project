import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { destacarMidiaDoHost, listarDestaques } from "./host-events";
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

async function destaquesDe(eventoId: string): Promise<string[]> {
  return comEvento(app, eventoId, (c) => listarDestaques(c, eventoId));
}

async function horaDoDestaque(midiaId: string): Promise<Date | null> {
  const { rows } = await admin.query<{ highlighted_at: Date | null }>(
    "SELECT highlighted_at FROM uploads WHERE id = $1",
    [midiaId],
  );
  return rows[0]?.highlighted_at ?? null;
}

describe("destaque de foto", () => {
  it("começa sem destaque nenhum", async () => {
    expect(await destaquesDe(dados.a.eventoId)).toEqual([]);
  });

  it("destaca e a foto aparece na lista", async () => {
    const ok = await destacarMidiaDoHost(
      app,
      dados.a.contaId,
      dados.a.eventoId,
      dados.a.uploadId,
      true,
    );

    expect(ok).toBe(true);
    expect(await destaquesDe(dados.a.eventoId)).toContain(dados.a.uploadId);
  });

  it("destacar de novo não mexe no horário do destaque original", async () => {
    const antes = await horaDoDestaque(dados.a.uploadId);

    await destacarMidiaDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.uploadId, true);

    expect(await horaDoDestaque(dados.a.uploadId)).toEqual(antes);
  });

  it("destacar não mexe no estado de moderação da foto", async () => {
    const { rows } = await admin.query<{ state: string }>(
      "SELECT state FROM uploads WHERE id = $1",
      [dados.a.uploadId],
    );

    expect(rows[0]?.state).toBe("published");
  });

  it("a política esconde o destaque alheio mesmo sem filtro na query", async () => {
    const tudoQueBVe = await comEvento(app, dados.b.eventoId, async (c) => {
      const { rows } = await c.query<{ id: string }>(
        "SELECT id FROM uploads WHERE highlighted_at IS NOT NULL",
      );
      return rows;
    });

    expect(tudoQueBVe).toEqual([]);
  });

  it("foto de outro evento não pode ser destacada por esta conta", async () => {
    const ok = await destacarMidiaDoHost(
      app,
      dados.a.contaId,
      dados.b.eventoId,
      dados.b.uploadId,
      true,
    );

    expect(ok).toBe(false);
    expect(await destaquesDe(dados.b.eventoId)).toEqual([]);
  });

  it("tira o destaque", async () => {
    const ok = await destacarMidiaDoHost(
      app,
      dados.a.contaId,
      dados.a.eventoId,
      dados.a.uploadId,
      false,
    );

    expect(ok).toBe(true);
    expect(await destaquesDe(dados.a.eventoId)).not.toContain(dados.a.uploadId);
  });

  it("foto oculta não vira destaque: destaque invisível não serve a ninguém", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 800000, 'removed') RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/2026/08/oculta/full`],
    );
    const ocultaId = rows[0]!.id;

    const ok = await destacarMidiaDoHost(
      app,
      dados.a.contaId,
      dados.a.eventoId,
      ocultaId,
      true,
    );

    expect(ok).toBe(false);
    expect(await destaquesDe(dados.a.eventoId)).not.toContain(ocultaId);
  });
});
