import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarSessao, resolverSessao } from "./sessoes";
import { criarEvento, HORAS_APOS_EVENTO, resolverSlug, rotacionarSlug } from "./eventos";
import { prepararBanco, semear } from "./testes/banco";

const SEGREDO = "um-segredo-de-teste-com-mais-de-32-caracteres";

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

const daquiA = (horas: number) => new Date(Date.now() + horas * 3600_000);

describe("o QR resolve o evento", () => {
  it("slug ativo dentro da janela abre", async () => {
    const r = await resolverSlug(app, "evento-a", new Date());

    expect(r.estado).toBe("aberto");
    expect(r.estado !== "desconhecido" && r.evento.eventoId).toBe(dados.a.eventoId);
  });

  it("slug que não existe não vaza nada além disso", async () => {
    expect(await resolverSlug(app, "nao-existe", new Date())).toEqual({ estado: "desconhecido" });
  });

  it("cada slug resolve para o seu evento", async () => {
    const a = await resolverSlug(app, "evento-a", new Date());
    const b = await resolverSlug(app, "evento-b", new Date());

    expect(a.estado !== "desconhecido" && a.evento.eventoId).toBe(dados.a.eventoId);
    expect(b.estado !== "desconhecido" && b.evento.eventoId).toBe(dados.b.eventoId);
  });
});

describe("estados de tempo", () => {
  it("antes de começar, o evento existe e a tela diz quando é", async () => {
    // Não é "não existe": é "ainda não". A diferença é o convidado que
    // escaneou cedo demais saber que está no lugar certo.
    const r = await resolverSlug(app, "evento-a", daquiA(-1));

    expect(r.estado).toBe("nao_comecou");
    expect(r.estado !== "desconhecido" && r.evento.comecaEm).toBeInstanceOf(Date);
  });

  it("a janela de 48h depois do fim ainda deixa a fila drenar", async () => {
    const quaseNoLimite = daquiA(6 + HORAS_APOS_EVENTO - 1);

    expect((await resolverSlug(app, "evento-a", quaseNoLimite)).estado).toBe("aberto");
  });

  it("passadas as 48h, encerra", async () => {
    // É o convidado que fotografou às 2h, guardou o celular sem sinal e só
    // abriu no domingo. Fechar no fim da festa jogaria fora as fotos do fim.
    const depois = daquiA(6 + HORAS_APOS_EVENTO + 1);

    expect((await resolverSlug(app, "evento-a", depois)).estado).toBe("encerrado");
  });
});

describe("rotação de slug", () => {
  it("o slug novo abre e o antigo orienta em vez de dar erro", async () => {
    await rotacionarSlug(admin, dados.b.eventoId, "evento-b-novo");

    const novo = await resolverSlug(app, "evento-b-novo", new Date());
    const antigo = await resolverSlug(app, "evento-b", new Date());

    expect(novo.estado).toBe("aberto");
    // A placa já saiu da gráfica: quem escanear a antiga precisa cair numa
    // página de orientação, nunca num 404 seco (N1.5).
    expect(antigo.estado).toBe("slug_rotacionado");
    expect(antigo.estado !== "desconhecido" && antigo.evento.eventoId).toBe(dados.b.eventoId);
  });

  it("sessão aberta antes da rotação continua valendo", async () => {
    const { token } = await criarSessao(app, SEGREDO, {
      eventoId: dados.a.eventoId,
      nome: "Cida",
      consentimentoVersao: "v1",
      duracaoHoras: 48,
    });

    await rotacionarSlug(admin, dados.a.eventoId, "evento-a-novo");

    // Rotacionar não pode derrubar quem está subindo foto: o que expira a
    // sessão é o token, não o slug.
    await expect(resolverSessao(app, SEGREDO, token)).resolves.toMatchObject({
      eventoId: dados.a.eventoId,
    });
  });
});

describe("o anfitrião cria o evento", () => {
  it("cria sob a própria conta, e o slug abre o novo evento", async () => {
    const { eventoId, slug } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    // Nasceu preso à conta A — pela política conta_evento e o WITH CHECK.
    const { rows } = await admin.query<{ account_id: string }>(
      "SELECT account_id FROM events WHERE id = $1",
      [eventoId],
    );
    expect(rows[0]?.account_id).toBe(dados.a.contaId);

    // E o slug, criado na mesma transação, resolve o evento.
    const r = await resolverSlug(app, slug, new Date());
    expect(r.estado).toBe("aberto");
    expect(r.estado !== "desconhecido" && r.evento.eventoId).toBe(eventoId);
  });

  it("recusa pack fora do conjunto — a FK estoura antes de qualquer linha", async () => {
    await expect(
      criarEvento(app, {
        accountId: dados.a.contaId,
        packId: "pack-que-nao-existe",
        comecaEm: daquiA(-1),
        terminaEm: daquiA(6),
      }),
    ).rejects.toThrow();
  });
});
