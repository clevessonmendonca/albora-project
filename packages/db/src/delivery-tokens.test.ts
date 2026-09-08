import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErroTokenDeEntrega,
  issueDeliveryToken,
  resolveDeliveryToken,
} from "./delivery-tokens";
import { prepararBanco, semear } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";

const daqui = (min: number) => new Date(Date.now() + min * 60 * 1000);

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

describe("delivery-tokens — mint e resolve", () => {
  it("roundtrip: emitido resolve para o mesmo evento/sessão", async () => {
    const { token } = await issueDeliveryToken(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      daqui(60 * 24 * 7),
    );

    const resolvido = await resolveDeliveryToken(admin, SEGREDO, token);
    expect(resolvido).toEqual({ eventId: dados.a.eventoId, sessionId: dados.a.sessaoId });
  });

  it("token forjado (assinatura inválida) recusa sem tocar o banco", async () => {
    await expect(
      resolveDeliveryToken(admin, SEGREDO, "forjado.sem-assinatura-valida"),
    ).rejects.toBeInstanceOf(ErroTokenDeEntrega);
  });

  it("token expirado recusa", async () => {
    const { token } = await issueDeliveryToken(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      daqui(-1),
    );

    await expect(resolveDeliveryToken(admin, SEGREDO, token)).rejects.toBeInstanceOf(
      ErroTokenDeEntrega,
    );
  });

  it("token revogado recusa", async () => {
    const { token } = await issueDeliveryToken(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      daqui(60 * 24 * 7),
    );

    await admin.query(
      "UPDATE delivery_tokens SET revoked_at = now() WHERE event_id = $1 AND session_id = $2",
      [dados.a.eventoId, dados.a.sessaoId],
    );

    await expect(resolveDeliveryToken(admin, SEGREDO, token)).rejects.toBeInstanceOf(
      ErroTokenDeEntrega,
    );
  });

  it("token de um evento não resolve para dados de outro (isolamento)", async () => {
    const tokenA = await issueDeliveryToken(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      daqui(60),
    );
    const tokenB = await issueDeliveryToken(
      admin,
      SEGREDO,
      dados.b.eventoId,
      dados.b.sessaoId,
      daqui(60),
    );

    const resolvidoA = await resolveDeliveryToken(admin, SEGREDO, tokenA.token);
    const resolvidoB = await resolveDeliveryToken(admin, SEGREDO, tokenB.token);

    expect(resolvidoA).toEqual({ eventId: dados.a.eventoId, sessionId: dados.a.sessaoId });
    expect(resolvidoB).toEqual({ eventId: dados.b.eventoId, sessionId: dados.b.sessaoId });
  });

  it("token desconhecido recusa", async () => {
    const { token } = await issueDeliveryToken(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      daqui(60),
    );
    await admin.query("DELETE FROM delivery_tokens WHERE event_id = $1", [dados.a.eventoId]);

    await expect(resolveDeliveryToken(admin, SEGREDO, token)).rejects.toBeInstanceOf(
      ErroTokenDeEntrega,
    );
  });

  it("resolve funciona no pool real (albora_app), não só no admin", async () => {
    const { token } = await issueDeliveryToken(
      admin,
      SEGREDO,
      dados.a.eventoId,
      dados.a.sessaoId,
      daqui(60 * 24 * 7),
    );

    const resolvido = await resolveDeliveryToken(app, SEGREDO, token);
    expect(resolvido).toEqual({ eventId: dados.a.eventoId, sessionId: dados.a.sessaoId });
  });
});
