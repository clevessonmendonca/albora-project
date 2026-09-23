import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { desmarcarItemChecklist, lerChecklist, marcarItemChecklist } from "./checklist";
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

describe("checklist de preparo", () => {
  it("começa vazio", async () => {
    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens).toEqual([]);
  });

  it("marca e lê de volta", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "prova-qr", dados.a.contaId),
    );

    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens).toContain("prova-qr");
  });

  it("marcar duas vezes não quebra nem duplica", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "telao", dados.a.contaId),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "telao", dados.a.contaId),
    );

    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens.filter((i) => i === "telao")).toHaveLength(1);
  });

  it("desmarca", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "mc", dados.a.contaId),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      desmarcarItemChecklist(c, dados.a.eventoId, "mc"),
    );

    const itens = await comEvento(app, dados.a.eventoId, (c) =>
      lerChecklist(c, dados.a.eventoId),
    );

    expect(itens).not.toContain("mc");
  });

  it("a política esconde o checklist alheio mesmo sem filtro na query", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      marcarItemChecklist(c, dados.a.eventoId, "pecas", dados.a.contaId),
    );

    const tudoQueBVe = await comEvento(app, dados.b.eventoId, async (c) => {
      const { rows } = await c.query<{ item_key: string }>("SELECT item_key FROM event_checklist");
      return rows;
    });

    expect(tudoQueBVe).toEqual([]);
  });

  it("desmarcar item de outro evento não apaga nada", async () => {
    await comEvento(app, dados.b.eventoId, (c) =>
      desmarcarItemChecklist(c, dados.b.eventoId, "pecas"),
    );

    const deA = await comEvento(app, dados.a.eventoId, (c) => lerChecklist(c, dados.a.eventoId));

    expect(deA).toContain("pecas");
  });
});
