import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./evento";
import { listarMidiaDaParede } from "./parede-midia";
import { prepararBanco, semear } from "./testes/banco";

/**
 * A leitura da parede contra banco real, nunca mock: o que importa provar é que
 * a RLS a escopa ao evento do crachá, e mock de RLS prova que o mock isola.
 */

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

describe("a parede lê só o evento do crachá", () => {
  it("devolve a mídia do evento do contexto, e nenhuma de outro", async () => {
    const doA = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDaParede(c, dados.a.eventoId),
    );

    expect(doA.map((m) => m.id)).toContain(dados.a.uploadId);
    expect(doA.map((m) => m.id)).not.toContain(dados.b.uploadId);
  });

  it("mesmo pedindo o id do outro evento, a RLS não o entrega", async () => {
    // Passar o event_id de B para uma transação escopada em A não pode furar a
    // política: o filtro no SQL e a RLS concordam, e o resultado é vazio.
    const cruzado = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDaParede(c, dados.b.eventoId),
    );

    expect(cruzado).toHaveLength(0);
  });

  it("some do telão o que sai de published — a mesma coluna do feed", async () => {
    await admin.query("UPDATE uploads SET state = 'removed' WHERE id = $1", [dados.a.uploadId]);
    try {
      const depois = await comEvento(app, dados.a.eventoId, (c) =>
        listarMidiaDaParede(c, dados.a.eventoId),
      );
      expect(depois.map((m) => m.id)).not.toContain(dados.a.uploadId);
    } finally {
      await admin.query("UPDATE uploads SET state = 'published' WHERE id = $1", [dados.a.uploadId]);
    }
  });

  it("a chave da thumb é irmã da full, sob a pasta do evento", async () => {
    const [midia] = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDaParede(c, dados.a.eventoId),
    );

    expect(midia?.chaveFull.endsWith("/full")).toBe(true);
    expect(midia?.chaveThumb).toBe(midia?.chaveFull.replace(/\/full$/, "/thumb"));
    expect(midia?.chaveThumb.startsWith(`events/${dados.a.eventoId}/`)).toBe(true);
  });
});
