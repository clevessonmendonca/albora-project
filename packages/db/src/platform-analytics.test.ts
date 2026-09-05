import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  platformFunnelInWindow,
  platformParticipationDailySeries,
  platformParticipationInWindow,
  platformVolumeInWindow,
} from "./platform-analytics";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;
let agregador: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  agregador = pools.agregador;
}, 60_000);

afterAll(async () => {
  await admin?.end();
  await agregador?.end();
});

describe("platformParticipationInWindow", () => {
  it("soma expected_guests e sessões-com-upload só dos eventos na janela", async () => {
    await prepararBanco();
    const { a, b } = await semear(admin);
    await admin.query("UPDATE events SET expected_guests = 100, starts_at = now() - interval '1 day' WHERE id = $1", [a.eventoId]);
    await admin.query("UPDATE events SET expected_guests = 50, starts_at = now() - interval '40 days' WHERE id = $1", [b.eventoId]);

    const janela = await platformParticipationInWindow(agregador, {
      from: new Date(Date.now() - 7 * 86_400_000),
      to: new Date(),
    });

    expect(janela.expectedGuests).toBe(100);
    expect(janela.sessoesComUpload).toBe(1);
  });

  it("janela sem evento nenhum devolve zeros, não erro", async () => {
    await prepararBanco();
    const janela = await platformParticipationInWindow(agregador, {
      from: new Date(Date.now() - 86_400_000),
      to: new Date(),
    });
    expect(janela).toEqual({ expectedGuests: 0, sessoesComUpload: 0 });
  });
});

describe("platformParticipationDailySeries", () => {
  it("devolve um ponto por dia, taxa null quando não há evento no dia", async () => {
    await prepararBanco();
    const serie = await platformParticipationDailySeries(agregador, 5);
    expect(serie).toHaveLength(5);
    expect(serie.every((p) => p.rate === null)).toBe(true);
  });
});

describe("platformFunnelInWindow", () => {
  it("agrega degraus cross-evento a partir de funnel_events", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    await admin.query(
      `INSERT INTO funnel_events (event_id, session_id, name) VALUES ($1, $2, 'qr_scan'), ($1, $2, 'page_open'), ($1, $2, 'consent')`,
      [a.eventoId, a.sessaoId],
    );
    const degraus = await platformFunnelInWindow(agregador, {
      from: new Date(Date.now() - 86_400_000),
      to: new Date(Date.now() + 86_400_000),
    });
    const consent = degraus.find((d) => d.etapa === "consent");
    expect(consent?.sessoes).toBe(1);
  });
});

describe("platformVolumeInWindow", () => {
  it("conta eventos e fotos na janela", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const volume = await platformVolumeInWindow(agregador, {
      from: new Date(0),
      to: new Date(Date.now() + 86_400_000),
    });
    expect(volume.eventsCreated).toBeGreaterThanOrEqual(1);
    expect(volume.photos).toBeGreaterThanOrEqual(1);
    void a;
  });
});
