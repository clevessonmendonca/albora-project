import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { janelaDoAlbum, listarMidiaDoAlbum } from "./album-db";
import { comEvento } from "./evento";
import { prepararBanco, semear } from "./testes/banco";

/**
 * A leitura do álbum contra banco real, nunca mock: o que importa provar é que
 * a RLS a escopa ao evento do contexto, e mock de RLS prova que o mock isola. O
 * álbum é derivado da mídia publicada — a mesma coluna do feed e da parede.
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

describe("o álbum lê só o evento do contexto", () => {
  it("o álbum de A contém a mídia de A e nunca a de B", async () => {
    const doA = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDoAlbum(c, dados.a.eventoId),
    );

    expect(doA.map((m) => m.id)).toContain(dados.a.uploadId);
    expect(doA.map((m) => m.id)).not.toContain(dados.b.uploadId);
  });

  it("mesmo pedindo o id do outro evento, a RLS não o entrega", async () => {
    const cruzado = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDoAlbum(c, dados.b.eventoId),
    );

    expect(cruzado).toHaveLength(0);
  });

  it("some do álbum o que sai de published — a mesma coluna do feed", async () => {
    await admin.query("UPDATE uploads SET state = 'removed' WHERE id = $1", [dados.a.uploadId]);
    try {
      const depois = await comEvento(app, dados.a.eventoId, (c) =>
        listarMidiaDoAlbum(c, dados.a.eventoId),
      );
      expect(depois.map((m) => m.id)).not.toContain(dados.a.uploadId);
    } finally {
      await admin.query("UPDATE uploads SET state = 'published' WHERE id = $1", [dados.a.uploadId]);
    }
  });

  it("entrega o que o núcleo pede: chave full/thumb e o instante de recepção", async () => {
    const [midia] = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDoAlbum(c, dados.a.eventoId),
    );

    expect(midia?.chaveFull.endsWith("/full")).toBe(true);
    expect(midia?.chaveThumb).toBe(midia?.chaveFull.replace(/\/full$/, "/thumb"));
    expect(midia?.chaveThumb.startsWith(`events/${dados.a.eventoId}/`)).toBe(true);
    expect(midia?.recebidaEm).toBeInstanceOf(Date);
    expect(midia?.sessaoId).toBe(dados.a.sessaoId);
  });

  it("a janela do evento vem do contexto, e a de outro evento não vaza", async () => {
    const janela = await comEvento(app, dados.a.eventoId, (c) =>
      janelaDoAlbum(c, dados.a.eventoId),
    );
    expect(janela?.comecaEm).toBeInstanceOf(Date);
    expect(janela?.terminaEm).toBeInstanceOf(Date);

    const deB = await comEvento(app, dados.a.eventoId, (c) => janelaDoAlbum(c, dados.b.eventoId));
    expect(deB).toBeNull();
  });
});
