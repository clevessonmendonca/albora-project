import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarSessao, resolverSessao } from "./sessions";
import {
  criarEvento,
  ErroContaDoCasalInvalida,
  HORAS_APOS_EVENTO,
  resolverSlug,
  rotacionarSlug,
} from "./events";
import { atualizarConfigDoEvento } from "./host-events";
import { roleForAccountOnEvent } from "./memberships";
import { ErroSemAcessoAoFornecedor } from "./vendor-portal";
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
  it("cria sob a própria conta, e o slug já existe — mas em rascunho", async () => {
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

    // O slug, criado na mesma transação, já resolve o evento — mas em
    // rascunho: o gate de publicação (task 6, gap I1) barra o convidado até
    // o anfitrião publicar de propósito.
    const r = await resolverSlug(app, slug, new Date());
    expect(r.estado).toBe("rascunho");
    expect(r.estado !== "desconhecido" && r.evento.eventoId).toBe(eventoId);
  });

  it("grava America/Sao_Paulo quando o anfitrião não manda fuso", async () => {
    const { eventoId } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    const { rows } = await admin.query<{ timezone: string }>(
      "SELECT timezone FROM events WHERE id = $1",
      [eventoId],
    );
    expect(rows[0]?.timezone).toBe("America/Sao_Paulo");
  });

  it("grava o IANA que o anfitrião escolheu", async () => {
    const { eventoId } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
      fuso: "Pacific/Honolulu",
    });

    const { rows } = await admin.query<{ timezone: string }>(
      "SELECT timezone FROM events WHERE id = $1",
      [eventoId],
    );
    expect(rows[0]?.timezone).toBe("Pacific/Honolulu");
  });

  it("o anfitrião troca o fuso depois de criar", async () => {
    const { eventoId } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    const ok = await atualizarConfigDoEvento(app, dados.a.contaId, eventoId, {
      fuso: "America/Manaus",
    });
    expect(ok).toBe(true);

    const { rows } = await admin.query<{ timezone: string }>(
      "SELECT timezone FROM events WHERE id = $1",
      [eventoId],
    );
    expect(rows[0]?.timezone).toBe("America/Manaus");
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

describe("o anfitrião cria um evento sob um fornecedor (spec-canal-fornecedor §2)", () => {
  const contaDoCasal = async (email: string) => {
    const { rows } = await admin.query<{ id: string }>(
      "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
      [email],
    );
    return rows[0]!.id;
  };

  it(
    "membro do fornecedor: nasce com vendor_id, plan='vendor', dono é o CASAL — " +
      "fornecedor é planner (sem canManageCoupleOnly), casal é owner (com canManageCoupleOnly)",
    async () => {
      const { rows: v } = await admin.query<{ id: string }>(
        "INSERT INTO vendors (name) VALUES ('Buffet Teste V2d') RETURNING id",
      );
      const vendorId = v[0]!.id;
      await admin.query(
        "INSERT INTO vendor_members (vendor_id, account_id, role) VALUES ($1, $2, 'staff')",
        [vendorId, dados.a.contaId],
      );
      const coupleAccountId = await contaDoCasal("casal-v2d@exemplo.test");

      const { eventoId } = await criarEvento(app, {
        accountId: dados.a.contaId,
        packId: "pack-um",
        comecaEm: daquiA(-1),
        terminaEm: daquiA(6),
        vendorId,
        coupleAccountId,
      });

      const { rows } = await admin.query<{ account_id: string; vendor_id: string; plan: string }>(
        "SELECT account_id, vendor_id, plan FROM events WHERE id = $1",
        [eventoId],
      );
      // O dono da fatura (events.account_id) é o CASAL, nunca o fornecedor.
      expect(rows[0]?.account_id).toBe(coupleAccountId);
      expect(rows[0]?.vendor_id).toBe(vendorId);
      expect(rows[0]?.plan).toBe("vendor");

      const { rows: membros } = await admin.query<{ account_id: string; role: string }>(
        "SELECT account_id, role FROM event_members WHERE event_id = $1 ORDER BY role",
        [eventoId],
      );
      expect(membros).toEqual(
        expect.arrayContaining([
          { account_id: coupleAccountId, role: "couple" },
          { account_id: dados.a.contaId, role: "planner" },
        ]),
      );

      // Critério de aceite desta correção: `roleForAccountOnEvent` resolve o fornecedor como `planner` (canManageCoupleOnly=false, load-event-page.ts) e o casal como `owner` (canManageCoupleOnly=true) — nunca o contrário.
      expect(await roleForAccountOnEvent(app, dados.a.contaId, eventoId)).toBe("planner");
      expect(await roleForAccountOnEvent(app, coupleAccountId, eventoId)).toBe("owner");
    },
  );

  it("conta sem vínculo em vendor_members é recusada — nenhuma linha nasce", async () => {
    const { rows: v } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ('Buffet Fora V2d') RETURNING id",
    );
    const vendorId = v[0]!.id;
    const coupleAccountId = await contaDoCasal("casal-fora-v2d@exemplo.test");

    await expect(
      criarEvento(app, {
        accountId: dados.b.contaId,
        packId: "pack-um",
        comecaEm: daquiA(-1),
        terminaEm: daquiA(6),
        vendorId,
        coupleAccountId,
      }),
    ).rejects.toBeInstanceOf(ErroSemAcessoAoFornecedor);

    const { rows } = await admin.query("SELECT 1 FROM events WHERE vendor_id = $1", [vendorId]);
    expect(rows).toHaveLength(0);
  });

  it("vendorId malformado é recusado antes de tocar o banco", async () => {
    const coupleAccountId = await contaDoCasal("casal-malformado-v2d@exemplo.test");

    await expect(
      criarEvento(app, {
        accountId: dados.a.contaId,
        packId: "pack-um",
        comecaEm: daquiA(-1),
        terminaEm: daquiA(6),
        vendorId: "nao-e-um-uuid",
        coupleAccountId,
      }),
    ).rejects.toBeInstanceOf(ErroSemAcessoAoFornecedor);
  });

  it("vendorId sem coupleAccountId (ausente ou malformado) é recusado antes de tocar o banco", async () => {
    const { rows: v } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ('Buffet Sem Casal V2d') RETURNING id",
    );
    const vendorId = v[0]!.id;
    await admin.query(
      "INSERT INTO vendor_members (vendor_id, account_id, role) VALUES ($1, $2, 'staff')",
      [vendorId, dados.a.contaId],
    );

    await expect(
      criarEvento(app, {
        accountId: dados.a.contaId,
        packId: "pack-um",
        comecaEm: daquiA(-1),
        terminaEm: daquiA(6),
        vendorId,
      }),
    ).rejects.toBeInstanceOf(ErroContaDoCasalInvalida);

    await expect(
      criarEvento(app, {
        accountId: dados.a.contaId,
        packId: "pack-um",
        comecaEm: daquiA(-1),
        terminaEm: daquiA(6),
        vendorId,
        coupleAccountId: "nao-e-um-uuid",
      }),
    ).rejects.toBeInstanceOf(ErroContaDoCasalInvalida);

    const { rows } = await admin.query("SELECT 1 FROM events WHERE vendor_id = $1", [vendorId]);
    expect(rows).toHaveLength(0);
  });

  it(
    "coupleAccountId igual ao accountId do fornecedor é recusado — sem isso ele nasceria " +
      "owner por coincidência de e-mail, a exata fronteira que esta correção fecha",
    async () => {
      const { rows: v } = await admin.query<{ id: string }>(
        "INSERT INTO vendors (name) VALUES ('Buffet Mesmo E-mail V2d') RETURNING id",
      );
      const vendorId = v[0]!.id;
      await admin.query(
        "INSERT INTO vendor_members (vendor_id, account_id, role) VALUES ($1, $2, 'staff')",
        [vendorId, dados.a.contaId],
      );

      await expect(
        criarEvento(app, {
          accountId: dados.a.contaId,
          packId: "pack-um",
          comecaEm: daquiA(-1),
          terminaEm: daquiA(6),
          vendorId,
          coupleAccountId: dados.a.contaId,
        }),
      ).rejects.toBeInstanceOf(ErroContaDoCasalInvalida);

      // Nenhuma linha nasce em `events` — como `event_members.event_id` é FK pra `events`, a ausência de evento já prova a ausência de `event_members` desta tentativa: o guard estoura antes de qualquer INSERT na transação.
      const { rows: linhaEvento } = await admin.query(
        "SELECT 1 FROM events WHERE vendor_id = $1",
        [vendorId],
      );
      expect(linhaEvento).toHaveLength(0);
    },
  );

  it("sem vendorId, o comportamento de hoje continua: plan='free', criador como couple", async () => {
    const { eventoId } = await criarEvento(app, {
      accountId: dados.a.contaId,
      packId: "pack-um",
      comecaEm: daquiA(-1),
      terminaEm: daquiA(6),
    });

    const { rows } = await admin.query<{ vendor_id: string | null; plan: string }>(
      "SELECT vendor_id, plan FROM events WHERE id = $1",
      [eventoId],
    );
    expect(rows[0]?.vendor_id).toBeNull();
    expect(rows[0]?.plan).toBe("free");

    const { rows: membro } = await admin.query<{ role: string }>(
      "SELECT role FROM event_members WHERE event_id = $1 AND account_id = $2",
      [eventoId, dados.a.contaId],
    );
    expect(membro[0]?.role).toBe("couple");
  });
});
