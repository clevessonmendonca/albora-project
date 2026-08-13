import type pg from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { contarDenuncias, denunciar, ErroMidiaDeOutroEvento } from "./moderation-db";
import { prepararBanco, semear } from "./testes/banco";

/**
 * A denúncia contra banco real, nunca mock: o que importa provar é que a RLS a
 * escopa ao evento do contexto e que a PK (upload_id, session_id) faz uma
 * sessão contar uma vez — mock de RLS prova que o mock isola.
 */

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;
let outroDeA: string;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);

  // Uma segunda sessão no evento A: duas sessões distintas denunciando a mesma
  // foto é o que soma para segurar do telão.
  const { rows } = await admin.query<{ id: string }>(
    `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
     VALUES ($1, 'outro-convidado', 'v1', now()) RETURNING id`,
    [dados.a.eventoId],
  );
  outroDeA = rows[0]!.id;
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

beforeEach(async () => {
  await admin.query("DELETE FROM reports");
});

describe("a denúncia é escopada ao evento do contexto", () => {
  it("uma denúncia da foto do evento aparece na contagem, e nenhuma de outro", async () => {
    const r = await comEvento(app, dados.a.eventoId, (c) =>
      denunciar(c, { uploadId: dados.a.uploadId, sessaoId: dados.a.sessaoId }),
    );
    expect(r.registrada).toBe(true);

    const naA = await comEvento(app, dados.a.eventoId, (c) =>
      contarDenuncias(c, dados.a.uploadId),
    );
    expect(naA).toBe(1);
  });

  it("mesmo com o id da foto do outro evento em mãos, a RLS não deixa denunciar", async () => {
    // Passar o upload_id de B para uma transação escopada em A não pode furar a
    // política. A checagem de visibilidade sob RLS recusa antes do INSERT —
    // porque a FK ignoraria a RLS e gravaria linha inerte. Mesma recusa que um
    // id inexistente: distinguir vazaria que a foto existe em outra festa.
    await expect(
      comEvento(app, dados.a.eventoId, (c) =>
        denunciar(c, { uploadId: dados.b.uploadId, sessaoId: dados.a.sessaoId }),
      ),
    ).rejects.toBeInstanceOf(ErroMidiaDeOutroEvento);

    const contagemCruzada = await comEvento(app, dados.a.eventoId, (c) =>
      contarDenuncias(c, dados.b.uploadId),
    );
    expect(contagemCruzada).toBe(0);
  });
});

describe("uma sessão denuncia uma vez; duas sessões somam", () => {
  it("a mesma sessão denunciando de novo não infla a contagem", async () => {
    const primeira = await comEvento(app, dados.a.eventoId, (c) =>
      denunciar(c, { uploadId: dados.a.uploadId, sessaoId: dados.a.sessaoId }),
    );
    const segunda = await comEvento(app, dados.a.eventoId, (c) =>
      denunciar(c, { uploadId: dados.a.uploadId, sessaoId: dados.a.sessaoId }),
    );

    expect(primeira.registrada).toBe(true);
    expect(segunda.registrada).toBe(false);

    const total = await comEvento(app, dados.a.eventoId, (c) =>
      contarDenuncias(c, dados.a.uploadId),
    );
    expect(total).toBe(1);
  });

  it("duas sessões distintas na mesma foto contam duas — o limiar do telão", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      denunciar(c, { uploadId: dados.a.uploadId, sessaoId: dados.a.sessaoId }),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      denunciar(c, { uploadId: dados.a.uploadId, sessaoId: outroDeA }),
    );

    const total = await comEvento(app, dados.a.eventoId, (c) =>
      contarDenuncias(c, dados.a.uploadId),
    );
    expect(total).toBe(2);
  });
});
