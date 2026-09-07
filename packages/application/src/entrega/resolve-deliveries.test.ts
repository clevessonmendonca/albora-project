import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "@albora/db/testes/banco";
import { resolveDeliveries } from "./resolve-deliveries";

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

async function contato(
  eventoId: string,
  sessaoId: string,
  email: string,
  opcoes: { verificado?: boolean; entregue?: boolean } = {},
): Promise<void> {
  await admin.query(
    `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_at, verified_via, delivered_at)
     VALUES ($1, $2, 'email', $3, $4, $5, $6)`,
    [
      eventoId,
      sessaoId,
      email,
      opcoes.verificado === false ? null : new Date(),
      opcoes.verificado === false ? null : "google",
      opcoes.entregue ? new Date() : null,
    ],
  );
}

describe("resolveDeliveries", () => {
  it("gate fechado (delivery_opens_at NULL) → []", async () => {
    await contato(dados.a.eventoId, dados.a.sessaoId, "gate-fechado@exemplo.test");

    const resultado = await resolveDeliveries(app, dados.a.eventoId);

    expect(resultado).toEqual([]);
  });

  it("gate no futuro → []", async () => {
    const { rows } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status, delivery_opens_at)
       VALUES ($1, 'pack-um', 'evento-gate-futuro', now(), now() + interval '6 hours', 'active', now() + interval '1 day')
       RETURNING id`,
      [dados.a.contaId],
    );
    const eventoId = rows[0].id as string;
    const { rows: sessaoRows } = await admin.query(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado-gate-futuro', 'v1', now()) RETURNING id`,
      [eventoId],
    );
    const sessaoId = sessaoRows[0].id as string;
    await contato(eventoId, sessaoId, "gate-futuro@exemplo.test");

    const resultado = await resolveDeliveries(app, eventoId);

    expect(resultado).toEqual([]);
  });

  it("gate no passado com 2 contatos verificados não-entregues → os 2, excluindo não-verificado e já-entregue", async () => {
    const { rows } = await admin.query(
      `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status, delivery_opens_at)
       VALUES ($1, 'pack-um', 'evento-gate-passado', now(), now() + interval '6 hours', 'active', now() - interval '1 day')
       RETURNING id`,
      [dados.a.contaId],
    );
    const eventoId = rows[0].id as string;

    const novaSessao = async (nome: string) => {
      const { rows: sessaoRows } = await admin.query(
        `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
         VALUES ($1, $2, 'v1', now()) RETURNING id`,
        [eventoId, nome],
      );
      return sessaoRows[0].id as string;
    };

    const sessaoVerificada1 = await novaSessao("convidado-verificado-1");
    const sessaoVerificada2 = await novaSessao("convidado-verificado-2");
    const sessaoNaoVerificada = await novaSessao("convidado-nao-verificado");
    const sessaoJaEntregue = await novaSessao("convidado-ja-entregue");

    await contato(eventoId, sessaoVerificada1, "verificado-1@exemplo.test");
    await contato(eventoId, sessaoVerificada2, "verificado-2@exemplo.test");
    await contato(eventoId, sessaoNaoVerificada, "nao-verificado@exemplo.test", { verificado: false });
    await contato(eventoId, sessaoJaEntregue, "ja-entregue@exemplo.test", { entregue: true });

    const resultado = await resolveDeliveries(app, eventoId);

    expect(resultado).toHaveLength(2);
    expect(resultado).toEqual(
      expect.arrayContaining([
        { sessionId: sessaoVerificada1, email: "verificado-1@exemplo.test" },
        { sessionId: sessaoVerificada2, email: "verificado-2@exemplo.test" },
      ]),
    );
  });
});
