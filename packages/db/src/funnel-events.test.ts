import { randomUUID } from "node:crypto";
import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import { lerFunilAgregado } from "./funnel-aggregate";
import {
  ErroEventoDoFunilInvalido,
  registrarEntradaDoFunil,
  registrarEventoDoFunil,
} from "./funnel-events";
import { prepararBanco, semear } from "./testes/banco";
import { confirmarUpload } from "./uploads";

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

const entradaUpload = (uploadId: string, d: { eventoId: string; sessaoId: string }) => ({
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

async function nomesDaSessao(eventoId: string, sessaoId: string): Promise<string[]> {
  const { rows } = await admin.query<{ name: string }>(
    `SELECT name FROM funnel_events
      WHERE event_id = $1 AND session_id = $2
      ORDER BY created_at ASC, id ASC`,
    [eventoId, sessaoId],
  );
  return rows.map((r) => r.name);
}

describe("grava o nome que o agregador já lê", () => {
  it("recusa kind fora do contrato", async () => {
    await expect(
      comEvento(app, dados.a.eventoId, (c) =>
        registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "uploadOk" }),
      ),
    ).rejects.toBeInstanceOf(ErroEventoDoFunilInvalido);
  });

  it("a sessão de outro evento não recebe linha", async () => {
    const gravou = await comEvento(app, dados.a.eventoId, (c) =>
      registrarEventoDoFunil(c, { sessaoId: dados.b.sessaoId, name: "qr_scan" }),
    );
    expect(gravou).toBe(false);

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM funnel_events WHERE session_id = $1",
      [dados.b.sessaoId],
    );
    expect(rows[0]!.n).toBe(0);
  });
});

describe("scan e entrada não duplicam no refresh", () => {
  it("qr_scan, page_open e consent nascem uma vez só, nesta ordem", async () => {
    await comEvento(app, dados.a.eventoId, (c) =>
      registrarEntradaDoFunil(c, dados.a.sessaoId, "qr"),
    );
    await comEvento(app, dados.a.eventoId, (c) =>
      registrarEntradaDoFunil(c, dados.a.sessaoId, "qr"),
    );

    expect(await nomesDaSessao(dados.a.eventoId, dados.a.sessaoId)).toEqual([
      "qr_scan",
      "page_open",
      "consent",
    ]);
  });

  it("dois refreshes simultâneos do QR ainda dão uma linha", async () => {
    const resultados = await Promise.all([
      comEvento(app, dados.a.eventoId, (c) =>
        registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "feed_open" }),
      ),
      comEvento(app, dados.a.eventoId, (c) =>
        registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "feed_open" }),
      ),
    ]);

    expect(resultados.filter(Boolean)).toHaveLength(1);
    expect(await nomesDaSessao(dados.a.eventoId, dados.a.sessaoId)).toContain("feed_open");
  });
});

describe("confirm grava upload_ok, retry do mesmo arquivo não", () => {
  it("a primeira confirmação entra no funil; a segunda, não", async () => {
    const uploadId = randomUUID();

    const primeira = await comEvento(app, dados.a.eventoId, async (c) => {
      const r = await confirmarUpload(c, entradaUpload(uploadId, dados.a));
      if (r.estado === "criado") {
        await registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "upload_ok" });
      }
      return r.estado;
    });
    const segunda = await comEvento(app, dados.a.eventoId, async (c) => {
      const r = await confirmarUpload(c, entradaUpload(uploadId, dados.a));
      if (r.estado === "criado") {
        await registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "upload_ok" });
      }
      return r.estado;
    });

    expect(primeira).toBe("criado");
    expect(segunda).toBe("ja_existia");
    expect(
      (await nomesDaSessao(dados.a.eventoId, dados.a.sessaoId)).filter((n) => n === "upload_ok"),
    ).toHaveLength(1);
  });

  it("duas fotos da mesma sessão são dois upload_ok", async () => {
    const antes = (await nomesDaSessao(dados.a.eventoId, dados.a.sessaoId)).filter(
      (n) => n === "upload_ok",
    ).length;

    await comEvento(app, dados.a.eventoId, async (c) => {
      await confirmarUpload(c, entradaUpload(randomUUID(), dados.a));
      await registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "upload_ok" });
    });
    await comEvento(app, dados.a.eventoId, async (c) => {
      await confirmarUpload(c, entradaUpload(randomUUID(), dados.a));
      await registrarEventoDoFunil(c, { sessaoId: dados.a.sessaoId, name: "upload_ok" });
    });

    const depois = (await nomesDaSessao(dados.a.eventoId, dados.a.sessaoId)).filter(
      (n) => n === "upload_ok",
    ).length;
    expect(depois).toBe(antes + 2);
  });
});

describe("o agregador enxerga o que a sessão gravou, e só dela", () => {
  it("scan e confirm acendem a espinha da sessão A, não a de B", async () => {
    const funilA = await comEvento(app, dados.a.eventoId, (c) =>
      lerFunilAgregado(c, dados.a.eventoId),
    );
    const funilB = await comEvento(app, dados.b.eventoId, (c) =>
      lerFunilAgregado(c, dados.b.eventoId),
    );

    const qrA = funilA.degraus.find((d) => d.etapa === "qr_scan")?.sessoes ?? 0;
    const okA = funilA.degraus.find((d) => d.etapa === "upload_ok")?.sessoes ?? 0;
    expect(qrA).toBeGreaterThan(0);
    expect(okA).toBeGreaterThan(0);

    expect(funilB.degraus.every((d) => d.sessoes === 0)).toBe(true);
  });

  it("upload_ok antes e depois do feed_open saem separados", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'prova-feed', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    const sessaoId = rows[0]!.id;

    const antes = await comEvento(app, dados.a.eventoId, (c) =>
      lerFunilAgregado(c, dados.a.eventoId),
    );

    await comEvento(app, dados.a.eventoId, async (c) => {
      await registrarEventoDoFunil(c, { sessaoId, name: "upload_ok" });
      await registrarEventoDoFunil(c, { sessaoId, name: "upload_ok" });
      await registrarEventoDoFunil(c, { sessaoId, name: "feed_open" });
      await registrarEventoDoFunil(c, { sessaoId, name: "upload_ok" });
    });

    const depois = await comEvento(app, dados.a.eventoId, (c) =>
      lerFunilAgregado(c, dados.a.eventoId),
    );

    expect(depois.uploadsAntesDoFeed).toBe(antes.uploadsAntesDoFeed + 2);
    expect(depois.uploadsDepoisDoFeed).toBe(antes.uploadsDepoisDoFeed + 1);
  });
});

describe("QR não é atribuído a quem entrou pelo link", () => {
  it("WhatsApp grava page_open e consent, sem qr_scan", async () => {
    const { rows } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at, via)
       VALUES ($1, 'prova-wa', 'v1', now(), 'wa') RETURNING id`,
      [dados.b.eventoId],
    );
    const sessaoId = rows[0]!.id;

    await comEvento(app, dados.b.eventoId, (c) => registrarEntradaDoFunil(c, sessaoId, "wa"));

    expect(await nomesDaSessao(dados.b.eventoId, sessaoId)).toEqual(["page_open", "consent"]);
  });

  it("o agregador separa QR, WhatsApp e link copiado", async () => {
    const funil = await comEvento(app, dados.b.eventoId, (c) =>
      lerFunilAgregado(c, dados.b.eventoId),
    );

    expect(funil.entradasPorVia.wa).toBeGreaterThan(0);
    expect(funil.entradasPorVia.qr + funil.entradasPorVia.wa + funil.entradasPorVia.link).toBe(
      funil.totalSessoes,
    );
  });
});
