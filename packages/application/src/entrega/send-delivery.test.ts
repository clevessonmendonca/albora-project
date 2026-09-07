import type pg from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { resolveDeliveryToken } from "@albora/db";
import { runDeliveryForEvent, sendGuestDelivery, type EntregaDeps } from "./send-delivery";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const BASE_URL = "https://convidado.albora.test";

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

async function abrirGate(eventoId: string): Promise<void> {
  await admin.query("UPDATE events SET delivery_opens_at = now() - interval '1 hour' WHERE id = $1", [
    eventoId,
  ]);
}

async function contato(
  eventoId: string,
  sessaoId: string,
  email: string,
): Promise<void> {
  await admin.query(
    `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_at, verified_via)
     VALUES ($1, $2, 'email', $3, now(), 'google')`,
    [eventoId, sessaoId, email],
  );
}

async function entregueEm(eventoId: string, sessaoId: string, email: string): Promise<Date | null> {
  const { rows } = await admin.query<{ delivered_at: Date | null }>(
    `SELECT delivered_at FROM guest_contacts WHERE event_id = $1 AND session_id = $2 AND value = $3`,
    [eventoId, sessaoId, email],
  );
  return rows[0]?.delivered_at ?? null;
}

async function novaSessao(eventoId: string, nome: string): Promise<string> {
  const { rows } = await admin.query(
    `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
     VALUES ($1, $2, 'v1', now()) RETURNING id`,
    [eventoId, nome],
  );
  return rows[0].id as string;
}

let logSpy: ReturnType<typeof vi.spyOn>;
let warnSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  logSpy.mockRestore();
  warnSpy.mockRestore();
  errorSpy.mockRestore();
});

function semNenhumLogComEmail(email: string): void {
  const todasChamadas = [...logSpy.mock.calls, ...warnSpy.mock.calls, ...errorSpy.mock.calls];
  for (const chamada of todasChamadas) {
    for (const arg of chamada) {
      const texto = typeof arg === "string" ? arg : JSON.stringify(arg);
      expect(texto).not.toContain(email);
    }
  }
}

describe("sendGuestDelivery", () => {
  it("sendEmail bem-sucedido marca delivered_at e o link contém um token válido", async () => {
    const eventoId = dados.a.eventoId;
    const sessaoId = await novaSessao(eventoId, "convidado-sucesso");
    const email = "sucesso@exemplo.test";
    await contato(eventoId, sessaoId, email);

    let linkCapturado = "";
    const sendEmail = vi.fn(async (m: { to: string; subject: string; text: string }) => {
      linkCapturado = m.text;
      return { enviado: true };
    });
    const deps: EntregaDeps = { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail };

    const resultado = await sendGuestDelivery(deps, { eventId: eventoId, sessionId: sessaoId, email });

    expect(resultado).toEqual({ enviado: true });
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: email }));

    const entregue = await entregueEm(eventoId, sessaoId, email);
    expect(entregue).not.toBeNull();

    const match = linkCapturado.match(new RegExp(`${BASE_URL}/g/(\\S+)`));
    expect(match).not.toBeNull();
    const token = match![1]!;
    const resolvido = await resolveDeliveryToken(app, SEGREDO, token);
    expect(resolvido).toEqual({ eventId: eventoId, sessionId: sessaoId });

    semNenhumLogComEmail(email);
  });

  it("sendEmail retornando {enviado:false} NÃO marca delivered_at", async () => {
    const eventoId = dados.a.eventoId;
    const sessaoId = await novaSessao(eventoId, "convidado-falha");
    const email = "falha@exemplo.test";
    await contato(eventoId, sessaoId, email);

    const sendEmail = vi.fn(async () => ({ enviado: false }));
    const deps: EntregaDeps = { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail };

    const resultado = await sendGuestDelivery(deps, { eventId: eventoId, sessionId: sessaoId, email });

    expect(resultado).toEqual({ enviado: false });
    const entregue = await entregueEm(eventoId, sessaoId, email);
    expect(entregue).toBeNull();

    semNenhumLogComEmail(email);
  });
});

describe("runDeliveryForEvent", () => {
  it("idempotente: segunda rodada não reenvia quem já foi entregue", async () => {
    const eventoId = dados.b.eventoId;
    await abrirGate(eventoId);
    const sessaoId = await novaSessao(eventoId, "convidado-idempotente");
    const email = "idempotente@exemplo.test";
    await contato(eventoId, sessaoId, email);

    const sendEmail = vi.fn(async () => ({ enviado: true }));
    const deps: EntregaDeps = { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail };

    const primeira = await runDeliveryForEvent(deps, eventoId);
    expect(primeira).toEqual({ enviados: 1, pendentes: 0 });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    const segunda = await runDeliveryForEvent(deps, eventoId);
    expect(segunda).toEqual({ enviados: 0, pendentes: 0 });
    expect(sendEmail).toHaveBeenCalledTimes(1);

    semNenhumLogComEmail(email);
  });

  it("um destinatário que lança não aborta os outros", async () => {
    const { rows } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status, delivery_opens_at)
       VALUES ($1, 'pack-um', 'evento-entrega-parcial', now(), now() + interval '6 hours', 'active', now() - interval '1 hour')
       RETURNING id`,
      [dados.a.contaId],
    );
    const eventoId = rows[0].id as string;

    const sessaoOk = await novaSessao(eventoId, "convidado-ok");
    const sessaoLanca = await novaSessao(eventoId, "convidado-lanca");
    const emailOk = "ok@exemplo.test";
    const emailLanca = "lanca@exemplo.test";
    await contato(eventoId, sessaoOk, emailOk);
    await contato(eventoId, sessaoLanca, emailLanca);

    const sendEmail = vi.fn(async (m: { to: string }) => {
      if (m.to === emailLanca) throw new Error("Resend indisponível");
      return { enviado: true };
    });
    const deps: EntregaDeps = { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail };

    const resultado = await runDeliveryForEvent(deps, eventoId);

    expect(resultado).toEqual({ enviados: 1, pendentes: 1 });
    expect(await entregueEm(eventoId, sessaoOk, emailOk)).not.toBeNull();
    expect(await entregueEm(eventoId, sessaoLanca, emailLanca)).toBeNull();

    semNenhumLogComEmail(emailOk);
    semNenhumLogComEmail(emailLanca);
  });

  it("sendEmail que degrada (enviado:false) mantém pendente para o próximo run", async () => {
    const { rows } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status, delivery_opens_at)
       VALUES ($1, 'pack-um', 'evento-degrada', now(), now() + interval '6 hours', 'active', now() - interval '1 hour')
       RETURNING id`,
      [dados.a.contaId],
    );
    const eventoId = rows[0].id as string;
    const sessaoId = await novaSessao(eventoId, "convidado-degrada");
    const email = "degrada@exemplo.test";
    await contato(eventoId, sessaoId, email);

    let ligado = false;
    const sendEmail = vi.fn(async () => ({ enviado: ligado }));
    const deps: EntregaDeps = { pool: app, segredo: SEGREDO, baseUrl: BASE_URL, sendEmail };

    const primeira = await runDeliveryForEvent(deps, eventoId);
    expect(primeira).toEqual({ enviados: 0, pendentes: 1 });

    ligado = true;
    const segunda = await runDeliveryForEvent(deps, eventoId);
    expect(segunda).toEqual({ enviados: 1, pendentes: 0 });

    semNenhumLogComEmail(email);
  });
});
