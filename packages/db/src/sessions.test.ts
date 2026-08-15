import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  comSessao,
  criarSessao,
  ErroNomeInvalido,
  ErroSessaoInvalida,
  resolverSessao,
  revogarSessoesDoEvento,
} from "./sessions";
import { prepararBanco, semear } from "./testes/banco";
import { assinaturaValida, emitirToken, ErroSegredoDeSessao } from "./token";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";
const OUTRO_SEGREDO = "outro-segredo-de-teste-com-mais-de-32-chars";

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

const novaSessao = (eventoId: string, nome = "Cida") =>
  criarSessao(app, SEGREDO, {
    eventoId,
    nome,
    consentimentoVersao: "v1",
    duracaoHoras: 48,
  });

describe("token opaco e assinado", () => {
  it("a assinatura é verificada sem tocar no banco", () => {
    const { token } = emitirToken(SEGREDO);

    expect(assinaturaValida(SEGREDO, token)).toBe(true);
    expect(assinaturaValida(OUTRO_SEGREDO, token)).toBe(false);
  });

  it("token adulterado é recusado", () => {
    const { token } = emitirToken(SEGREDO);
    const [material, assinatura] = token.split(".") as [string, string];

    expect(assinaturaValida(SEGREDO, `${material}x.${assinatura}`)).toBe(false);
    expect(assinaturaValida(SEGREDO, `${material}.${assinatura}x`)).toBe(false);
    expect(assinaturaValida(SEGREDO, material)).toBe(false);
    expect(assinaturaValida(SEGREDO, "lixo")).toBe(false);
  });

  it("segredo ausente ou curto falha alto, não assina mal", () => {
    expect(() => emitirToken("")).toThrow(ErroSegredoDeSessao);
    expect(() => emitirToken("curto")).toThrow(ErroSegredoDeSessao);
  });

  it("o token nunca é guardado — só o hash", async () => {
    const { token } = await novaSessao(dados.a.eventoId);

    const { rows } = await admin.query<{ n: number }>(
      "SELECT count(*)::int AS n FROM session_tokens WHERE encode(token_hash, 'hex') LIKE $1",
      [`%${token.slice(0, 12)}%`],
    );
    expect(rows[0]!.n).toBe(0);
  });
});

describe("criar sessão", () => {
  it("grava consentimento com versão e data", async () => {
    const { sessaoId } = await novaSessao(dados.a.eventoId);

    const { rows } = await admin.query(
      "SELECT consent_version, consented_at, display_name, via FROM guest_sessions WHERE id = $1",
      [sessaoId],
    );

    expect(rows[0].consent_version).toBe("v1");
    expect(rows[0].consented_at).toBeInstanceOf(Date);
    expect(rows[0].display_name).toBe("Cida");
    expect(rows[0].via).toBe("link");
  });

  it("grava o canal de entrada informado", async () => {
    const { sessaoId } = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "QR",
      consentimentoVersao: "v1",
      duracaoHoras: 48,
      via: "qr",
    });

    const { rows } = await admin.query<{ via: string }>(
      "SELECT via FROM guest_sessions WHERE id = $1",
      [sessaoId],
    );
    expect(rows[0]!.via).toBe("qr");
  });

  it("nome é obrigatório", async () => {
    await expect(novaSessao(dados.a.eventoId, "   ")).rejects.toBeInstanceOf(ErroNomeInvalido);
    await expect(novaSessao(dados.a.eventoId, "x".repeat(41))).rejects.toBeInstanceOf(
      ErroNomeInvalido,
    );
  });

  it("sessão e token nascem na mesma transação", async () => {
    const { sessaoId, token } = await novaSessao(dados.a.eventoId);
    const resolvida = await resolverSessao(app, SEGREDO, token);

    expect(resolvida.sessaoId).toBe(sessaoId);
    expect(resolvida.eventoId).toBe(dados.a.eventoId);
  });
});

describe("o token vale para um evento, e só um", () => {
  it("resolve para o evento em que nasceu", async () => {
    const { token } = await novaSessao(dados.b.eventoId);

    expect((await resolverSessao(app, SEGREDO, token)).eventoId).toBe(dados.b.eventoId);
  });

  it("com a sessão de A, o convidado não enxerga upload de B", async () => {
    const { token } = await novaSessao(dados.a.eventoId);

    const visiveis = await comSessao(app, SEGREDO, token, async (c) => {
      const { rows } = await c.query("SELECT event_id FROM uploads");
      return rows;
    });

    expect(visiveis.every((r) => r.event_id === dados.a.eventoId)).toBe(true);
  });
});

describe("revogação e expiração", () => {
  it("revogar um evento não derruba o outro", async () => {
    const deA = await novaSessao(dados.a.eventoId);
    const deB = await novaSessao(dados.b.eventoId);

    const revogadas = await revogarSessoesDoEvento(admin, dados.a.eventoId);

    expect(revogadas).toBeGreaterThan(0);
    await expect(resolverSessao(app, SEGREDO, deA.token)).rejects.toBeInstanceOf(
      ErroSessaoInvalida,
    );
    await expect(resolverSessao(app, SEGREDO, deB.token)).resolves.toMatchObject({
      eventoId: dados.b.eventoId,
    });
  });

  it("token expirado é recusado", async () => {
    const { token } = await criarSessao(app, SEGREDO, {
      eventoId: dados.b.eventoId,
      nome: "Expirada",
      consentimentoVersao: "v1",
      duracaoHoras: -1,
    });

    await expect(resolverSessao(app, SEGREDO, token)).rejects.toBeInstanceOf(ErroSessaoInvalida);
  });

  it("a mensagem não distingue expirado de desconhecido", async () => {
    const desconhecido = emitirToken(SEGREDO).token;
    const erro = await resolverSessao(app, SEGREDO, desconhecido).catch((e) => e);

    // O motivo existe para log e métrica; a mensagem não conta ao atacante se
    // ele acertou um token que já existiu.
    expect(erro.message).toBe("sessão inválida");
    expect(erro.motivo).toBe("desconhecido");
  });
});

describe("rotação de slug não derruba sessão ativa", () => {
  it("a sessão continua valendo depois de o slug mudar", async () => {
    const { token } = await novaSessao(dados.a.eventoId);

    await comEvento(admin, dados.a.eventoId, async (c) => {
      await c.query("UPDATE events SET slug = $1 WHERE id = $2", [
        "slug-novo-rotacionado",
        dados.a.eventoId,
      ]);
    });

    // O que expira a sessão é o expires_at do token, não o slug — é o que
    // impede a rotação de derrubar quem está subindo foto (N1.5).
    await expect(resolverSessao(app, SEGREDO, token)).resolves.toMatchObject({
      eventoId: dados.a.eventoId,
    });
  });
});
