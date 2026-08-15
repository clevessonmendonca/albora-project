import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { listarMidiaDaParede } from "./wall-media";
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
  await admin.query("UPDATE uploads SET classifier_verdict = 'limpo' WHERE id IN ($1, $2)", [
    dados.a.uploadId,
    dados.b.uploadId,
  ]);
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

  it("duas sessões distintas denunciando seguram a foto do telão", async () => {
    // O sensor da sala: duas denúncias de sessões diferentes tiram do telão,
    // uma só não. É `decidirExibicao` na superfície telao, alimentada pela
    // contagem de `reports`.
    const { rows: outra } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'Léo', '1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    const segundaSessao = outra[0]!.id;

    const antes = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDaParede(c, dados.a.eventoId),
    );
    expect(antes.map((m) => m.id)).toContain(dados.a.uploadId);

    try {
      // Uma denúncia só: continua no telão.
      await admin.query(
        "INSERT INTO reports (event_id, upload_id, session_id) VALUES ($1, $2, $3)",
        [dados.a.eventoId, dados.a.uploadId, dados.a.sessaoId],
      );
      const comUma = await comEvento(app, dados.a.eventoId, (c) =>
        listarMidiaDaParede(c, dados.a.eventoId),
      );
      expect(comUma.map((m) => m.id)).toContain(dados.a.uploadId);

      // A segunda, de outra sessão: sai.
      await admin.query(
        "INSERT INTO reports (event_id, upload_id, session_id) VALUES ($1, $2, $3)",
        [dados.a.eventoId, dados.a.uploadId, segundaSessao],
      );
      const comDuas = await comEvento(app, dados.a.eventoId, (c) =>
        listarMidiaDaParede(c, dados.a.eventoId),
      );
      expect(comDuas.map((m) => m.id)).not.toContain(dados.a.uploadId);
    } finally {
      await admin.query("DELETE FROM reports WHERE upload_id = $1", [dados.a.uploadId]);
      await admin.query("DELETE FROM guest_sessions WHERE id = $1", [segundaSessao]);
    }
  });

  it("com menores, uma denuncia ja segura do telao", async () => {
    await admin.query("UPDATE events SET has_minors = true WHERE id = $1", [dados.a.eventoId]);
    const { rows: outra } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'Léo', '1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    const segundaSessao = outra[0]!.id;

    try {
      await admin.query(
        "INSERT INTO reports (event_id, upload_id, session_id) VALUES ($1, $2, $3)",
        [dados.a.eventoId, dados.a.uploadId, dados.a.sessaoId],
      );
      const comUma = await comEvento(app, dados.a.eventoId, (c) =>
        listarMidiaDaParede(c, dados.a.eventoId),
      );
      expect(comUma.map((m) => m.id)).not.toContain(dados.a.uploadId);
    } finally {
      await admin.query("DELETE FROM reports WHERE upload_id = $1", [dados.a.uploadId]);
      await admin.query("DELETE FROM guest_sessions WHERE id = $1", [segundaSessao]);
      await admin.query("UPDATE events SET has_minors = false WHERE id = $1", [dados.a.eventoId]);
    }
  });

  it("panico esvazia a parede", async () => {
    await admin.query("UPDATE events SET panic = true WHERE id = $1", [dados.a.eventoId]);
    try {
      const lista = await comEvento(app, dados.a.eventoId, (c) =>
        listarMidiaDaParede(c, dados.a.eventoId),
      );
      expect(lista).toHaveLength(0);
    } finally {
      await admin.query("UPDATE events SET panic = false WHERE id = $1", [dados.a.eventoId]);
    }
  });
});

describe("o classificador é o portão do telão, não da galeria", () => {
  async function publicar(veredicto: string | null): Promise<string> {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state, classifier_verdict)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published', $4)
       RETURNING id`,
      [
        dados.a.eventoId,
        dados.a.sessaoId,
        `events/${dados.a.eventoId}/${randomUUID()}/full`,
        veredicto,
      ],
    );
    return rows[0]!.id;
  }

  it("NULL e sem-resposta não entram na parede", async () => {
    const nula = await publicar(null);
    const muda = await publicar("sem-resposta");
    const limpa = await publicar("limpo");

    const parede = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDaParede(c, dados.a.eventoId),
    );
    const ids = parede.map((m) => m.id);

    expect(ids).not.toContain(nula);
    expect(ids).not.toContain(muda);
    expect(ids).toContain(limpa);
  });

  it("suspeito também some do telão", async () => {
    const suspeita = await publicar("suspeito");
    const parede = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDaParede(c, dados.a.eventoId),
    );
    expect(parede.map((m) => m.id)).not.toContain(suspeita);
  });

  it("liberação do anfitrião vence o silêncio do classificador", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO uploads (id, event_id, session_id, storage_key, mime, bytes, state,
                            classifier_verdict, released_by_host)
       VALUES (gen_random_uuid(), $1, $2, $3, 'image/jpeg', 500000, 'published',
               'sem-resposta', true)
       RETURNING id`,
      [dados.a.eventoId, dados.a.sessaoId, `events/${dados.a.eventoId}/${randomUUID()}/full`],
    );
    const id = rows[0]!.id;

    const parede = await comEvento(app, dados.a.eventoId, (c) =>
      listarMidiaDaParede(c, dados.a.eventoId),
    );
    expect(parede.map((m) => m.id)).toContain(id);
  });
});
