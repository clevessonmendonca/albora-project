import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bloquearConvidado } from "./block-db";
import { comEvento } from "./event";
import { perfilDoConvidado } from "./guest-profile";
import { prepararBanco, semear } from "./testes/banco";

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

describe("perfil de um convidado", () => {
  it("devolve o nome de quem enviou, para quem lê no mesmo evento", async () => {
    const perfil = await comEvento(app, dados.a.eventoId, (c) =>
      perfilDoConvidado(c, {
        eventoId: dados.a.eventoId,
        autorId: dados.a.sessaoId,
        leitorId: dados.a.sessaoId,
      }),
    );

    expect(perfil?.nome).toBe(`convidado-evento-a`);
  });

  it("id de sessão de outro evento não existe aqui — RLS, não erro", async () => {
    const perfil = await comEvento(app, dados.a.eventoId, (c) =>
      perfilDoConvidado(c, {
        eventoId: dados.a.eventoId,
        autorId: dados.b.sessaoId,
        leitorId: dados.a.sessaoId,
      }),
    );

    expect(perfil).toBeNull();
  });

  it("id que não é uuid devolve null, não estoura a consulta", async () => {
    const perfil = await comEvento(app, dados.a.eventoId, (c) =>
      perfilDoConvidado(c, {
        eventoId: dados.a.eventoId,
        autorId: "nao-e-um-uuid",
        leitorId: dados.a.sessaoId,
      }),
    );

    expect(perfil).toBeNull();
  });

  it("bloqueio simétrico esconde o nome — a mesma regra que já esconde a foto", async () => {
    const { rows: outra } = await admin.query<{ id: string }>(
      `INSERT INTO guest_sessions (event_id, display_name, consent_version, consented_at)
       VALUES ($1, 'leitor bloqueado', 'v1', now()) RETURNING id`,
      [dados.a.eventoId],
    );
    const leitorId = outra[0]!.id;

    await comEvento(app, dados.a.eventoId, (c) =>
      bloquearConvidado(c, {
        eventoId: dados.a.eventoId,
        bloqueadorId: dados.a.sessaoId,
        bloqueadoId: leitorId,
      }),
    );

    const perfil = await comEvento(app, dados.a.eventoId, (c) =>
      perfilDoConvidado(c, { eventoId: dados.a.eventoId, autorId: dados.a.sessaoId, leitorId }),
    );

    expect(perfil).toBeNull();
  });
});
