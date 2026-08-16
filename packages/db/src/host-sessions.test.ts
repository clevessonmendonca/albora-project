import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comEvento } from "./event";
import {
  definirNomeDaSessaoDoHost,
  listarSessoesDoHost,
} from "./host-sessions";
import { ErroNomeInvalido } from "./sessions";
import { prepararBanco, semear } from "./testes/banco";
import { listarMidiaDaParede } from "./wall-media";

let admin: pg.Pool;
let app: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  dados = await semear(admin);
  await admin.query("UPDATE uploads SET classifier_verdict = 'limpo' WHERE id = $1", [
    dados.a.uploadId,
  ]);
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end()]);
});

describe("o anfitrião troca o nome no telão sem apagar fotos", () => {
  it("lista a sessão com o nome e a contagem de fotos", async () => {
    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      listarSessoesDoHost(c, dados.a.eventoId),
    );
    const sessao = lista.find((s) => s.id === dados.a.sessaoId);
    expect(sessao?.nome).toBe("convidado-evento-a");
    expect(sessao?.fotos).toBeGreaterThan(0);
  });

  it("não lista sessão de outro evento", async () => {
    const lista = await comEvento(app, dados.a.eventoId, (c) =>
      listarSessoesDoHost(c, dados.a.eventoId),
    );
    expect(lista.map((s) => s.id)).not.toContain(dados.b.sessaoId);
  });

  it("oculta o nome e o telão passa a mostrar o placeholder", async () => {
    await admin.query("UPDATE guest_sessions SET display_name = $2 WHERE id = $1", [
      dados.a.sessaoId,
      "Ofensa",
    ]);

    try {
      const depois = await definirNomeDaSessaoDoHost(
        app,
        dados.a.contaId,
        dados.a.eventoId,
        dados.a.sessaoId,
        { acao: "ocultar" },
      );
      expect(depois?.nome).toBe("O·");

      const parede = await comEvento(app, dados.a.eventoId, (c) =>
        listarMidiaDaParede(c, dados.a.eventoId),
      );
      const midia = parede.find((m) => m.id === dados.a.uploadId);
      expect(midia?.autor).toBe("O·");
    } finally {
      await admin.query("UPDATE guest_sessions SET display_name = $2 WHERE id = $1", [
        dados.a.sessaoId,
        "convidado-evento-a",
      ]);
    }
  });

  it("renomeia e as fotos publicadas continuam", async () => {
    const { rows: antes } = await admin.query<{ n: number; state: string }>(
      `SELECT count(*)::int AS n, min(state) AS state FROM uploads WHERE session_id = $1`,
      [dados.a.sessaoId],
    );

    try {
      const depois = await definirNomeDaSessaoDoHost(
        app,
        dados.a.contaId,
        dados.a.eventoId,
        dados.a.sessaoId,
        { acao: "renomear", nome: "  Ana  " },
      );
      expect(depois?.nome).toBe("Ana");

      const { rows: depoisFotos } = await admin.query<{ n: number; state: string }>(
        `SELECT count(*)::int AS n, min(state) AS state FROM uploads WHERE session_id = $1`,
        [dados.a.sessaoId],
      );
      expect(depoisFotos[0]!.n).toBe(antes[0]!.n);
      expect(depoisFotos[0]!.state).toBe(antes[0]!.state);
      expect(depoisFotos[0]!.state).toBe("published");
    } finally {
      await admin.query("UPDATE guest_sessions SET display_name = $2 WHERE id = $1", [
        dados.a.sessaoId,
        "convidado-evento-a",
      ]);
    }
  });

  it("recusa nome curto demais", async () => {
    await expect(
      definirNomeDaSessaoDoHost(app, dados.a.contaId, dados.a.eventoId, dados.a.sessaoId, {
        acao: "renomear",
        nome: "x",
      }),
    ).rejects.toBeInstanceOf(ErroNomeInvalido);
  });

  it("não troca nome de evento alheio", async () => {
    const tentou = await definirNomeDaSessaoDoHost(
      app,
      dados.a.contaId,
      dados.b.eventoId,
      dados.b.sessaoId,
      { acao: "renomear", nome: "Invasor" },
    );
    expect(tentou).toBeNull();

    const { rows } = await admin.query<{ display_name: string }>(
      "SELECT display_name FROM guest_sessions WHERE id = $1",
      [dados.b.sessaoId],
    );
    expect(rows[0]!.display_name).toBe("convidado-evento-b");
  });

  it("sessão de outro evento no próprio id não casa", async () => {
    const tentou = await definirNomeDaSessaoDoHost(
      app,
      dados.a.contaId,
      dados.a.eventoId,
      dados.b.sessaoId,
      { acao: "ocultar" },
    );
    expect(tentou).toBeNull();
  });
});
