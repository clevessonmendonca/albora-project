import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco, semear } from "./testes/banco";

let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

describe("migration 0068 — guest_contacts verificado", () => {
  it("aceita verified_via 'google' e 'magic_link'", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado teste', '1.0', now()) RETURNING id`,
      [a.eventoId],
    );
    for (const via of ["google", "magic_link"]) {
      await expect(
        admin.query(
          `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_at, verified_via)
           VALUES ($1, $2, 'email', $3, now(), $4)`,
          [a.eventoId, sessao[0]!.id, `${via}@exemplo.test`, via],
        ),
      ).resolves.not.toThrow();
    }
  });

  it("recusa verified_via fora do enum", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado teste', '1.0', now()) RETURNING id`,
      [a.eventoId],
    );
    await expect(
      admin.query(
        `INSERT INTO guest_contacts (event_id, session_id, channel, value, verified_via)
         VALUES ($1, $2, 'email', 'x@exemplo.test', 'inventado')`,
        [a.eventoId, sessao[0]!.id],
      ),
    ).rejects.toThrow();
  });

  it("contato não-verificado continua válido (verified_at/verified_via NULL)", async () => {
    await prepararBanco();
    const { a } = await semear(admin);
    const { rows: sessao } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'convidado teste', '1.0', now()) RETURNING id`,
      [a.eventoId],
    );
    await expect(
      admin.query(
        `INSERT INTO guest_contacts (event_id, session_id, channel, value) VALUES ($1, $2, 'whatsapp', '5511999999999')`,
        [a.eventoId, sessao[0]!.id],
      ),
    ).resolves.not.toThrow();
  });
});
