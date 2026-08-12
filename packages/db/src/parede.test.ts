import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  ErroParedeInvalida,
  emitirCrachaDaParede,
  resolverParede,
  revogarParedesDoEvento,
} from "./parede";
import { criarSessao, resolverSessao } from "./sessoes";
import { prepararBanco, semear } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const OUTRO_SEGREDO = "outro-segredo-de-teste-com-mais-de-32-chars";

const hora = (n: number) => new Date(Date.now() + n * 60 * 60 * 1000);

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

describe("o crachá da parede resolve o evento", () => {
  it("emite e resolve para o evento certo", async () => {
    const token = await emitirCrachaDaParede(app, SEGREDO, dados.a.eventoId, hora(6));

    expect(await resolverParede(app, SEGREDO, token)).toEqual({ eventoId: dados.a.eventoId });
  });

  it("guarda o hash, nunca o token", async () => {
    // Um dump do banco não pode entregar a parede de ninguém: o token só
    // existe na URL que o anfitrião abriu na TV.
    const token = await emitirCrachaDaParede(app, SEGREDO, dados.a.eventoId, hora(6));
    const { rows } = await admin.query<{ achou: string }>(
      "SELECT count(*)::text AS achou FROM wall_tokens WHERE encode(token_hash, 'hex') = $1",
      [token],
    );

    expect(rows[0]?.achou).toBe("0");
  });

  it("recusa crachá assinado com outro segredo", async () => {
    const token = await emitirCrachaDaParede(app, OUTRO_SEGREDO, dados.a.eventoId, hora(6));

    await expect(resolverParede(app, SEGREDO, token)).rejects.toThrow(ErroParedeInvalida);
  });

  it("recusa crachá expirado", async () => {
    const token = await emitirCrachaDaParede(app, SEGREDO, dados.a.eventoId, hora(-1));

    await expect(resolverParede(app, SEGREDO, token)).rejects.toMatchObject({
      motivo: "expirado",
    });
  });

  it("recusa crachá desconhecido", async () => {
    const { token } = await import("./token").then((m) => m.emitirToken(SEGREDO));

    await expect(resolverParede(app, SEGREDO, token)).rejects.toMatchObject({
      motivo: "desconhecido",
    });
  });
});

describe("a parede não é uma sessão de convidado", () => {
  it("o crachá da parede não resolve como sessão", async () => {
    // O defeito que isto impede: reusar a credencial da TV para subir foto.
    // A TV fica ligada sozinha num salão, ao alcance de qualquer pessoa.
    const token = await emitirCrachaDaParede(app, SEGREDO, dados.a.eventoId, hora(6));

    await expect(resolverSessao(app, SEGREDO, token)).rejects.toThrow();
  });

  it("a tabela não tem coluna de sessão", async () => {
    // A ausência é a decisão: a parede não é uma pessoa, e inventar uma sessão
    // faria a auditoria atribuir a alguém o que uma TV fez sozinha.
    const { rows } = await admin.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'wall_tokens'",
    );

    expect(rows.map((r) => r.column_name)).not.toContain("session_id");
  });
});

describe("revogar a parede não derruba a festa", () => {
  it("o cabo sai da TV e os convidados continuam subindo foto", async () => {
    const daParede = await emitirCrachaDaParede(app, SEGREDO, dados.a.eventoId, hora(6));
    const doConvidado = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "Bia",
      consentimentoVersao: "1",
      duracaoHoras: 12,
    });

    await revogarParedesDoEvento(app, dados.a.eventoId);

    await expect(resolverParede(app, SEGREDO, daParede)).rejects.toMatchObject({
      motivo: "revogado",
    });
    await expect(resolverSessao(app, SEGREDO, doConvidado.token)).resolves.toMatchObject({
      eventoId: dados.a.eventoId,
    });
  });

  it("revogar um evento não toca na parede de outro", async () => {
    const doB = await emitirCrachaDaParede(app, SEGREDO, dados.b.eventoId, hora(6));

    await revogarParedesDoEvento(app, dados.a.eventoId);

    await expect(resolverParede(app, SEGREDO, doB)).resolves.toEqual({
      eventoId: dados.b.eventoId,
    });
  });
});
