import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { comAgregacao, comConta, comEvento, ErroEventoAusente } from "./event";
import { ErroSemAcessoAoFornecedor, eventosDoFornecedor } from "./vendor-portal";
import { prepararBanco, semear } from "./testes/banco";

/**
 * A suíte de isolamento. Contra banco real, **nunca mock** — testar
 * isolamento contra mock prova que o mock está isolado.
 *
 * Roda como `albora_app`, papel comum sem BYPASSRLS, porque superuser ignora
 * RLS mesmo com FORCE. Uma suíte conectada como dono passaria enxergando
 * tudo e diria que está tudo certo.
 */

let admin: pg.Pool;
let app: pg.Pool;
let agregador: pg.Pool;
let dados: Awaited<ReturnType<typeof semear>>;

const TABELAS_DE_EVENTO = [
  "events",
  "challenges",
  "guest_sessions",
  "guest_contacts",
  "uploads",
  "reactions",
  "funnel_events",
  "comments",
  "event_music",
  "music_suggestions",
  "reports",
  "recado",
  "recado_lido",
  "export_jobs",
];

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;
  agregador = pools.agregador;
  dados = await semear(admin);
  // Aquecimento: no Neon a primeira consulta acorda o compute, e o timeout
  // apareceria como falha de isolamento.
  await app.query("SELECT 1");
}, 60_000);

afterAll(async () => {
  await Promise.all([admin?.end(), app?.end(), agregador?.end()]);
});

describe("1 — consulta sem WHERE só devolve o evento do contexto", () => {
  it("uploads", async () => {
    const linhas = await comEvento(app, dados.a.eventoId, async (c) => {
      const { rows } = await c.query("SELECT event_id FROM uploads");
      return rows;
    });

    expect(linhas).toHaveLength(1);
    expect(linhas[0].event_id).toBe(dados.a.eventoId);
  });

  it("em todas as tabelas de evento", async () => {
    for (const tabela of TABELAS_DE_EVENTO) {
      const coluna = tabela === "events" ? "id" : "event_id";
      const alheias = await comEvento(app, dados.a.eventoId, async (c) => {
        const { rows } = await c.query(
          `SELECT count(*)::int AS n FROM ${tabela} WHERE ${coluna} <> $1`,
          [dados.a.eventoId],
        );
        return rows[0].n as number;
      });

      expect(alheias, `${tabela} vazou linha de outro evento`).toBe(0);
    }
  });
});

describe("2 — id conhecido do outro evento não é alcançável", () => {
  it("mesmo com o id em mãos, o SELECT devolve zero", async () => {
    const linhas = await comEvento(app, dados.a.eventoId, async (c) => {
      const { rows } = await c.query("SELECT id FROM uploads WHERE id = $1", [dados.b.uploadId]);
      return rows;
    });

    expect(linhas).toHaveLength(0);
  });

  it("um UPDATE mal escrito não alcança o outro evento", async () => {
    const afetadas = await comEvento(app, dados.a.eventoId, async (c) => {
      const r = await c.query("UPDATE uploads SET caption = 'invadido' WHERE id = $1", [
        dados.b.uploadId,
      ]);
      return r.rowCount;
    });

    expect(afetadas).toBe(0);

    const { rows } = await admin.query("SELECT caption FROM uploads WHERE id = $1", [
      dados.b.uploadId,
    ]);
    expect(rows[0].caption).toBeNull();
  });
});

describe("3 — sem app.event_id, o sistema falha fechado", () => {
  /**
   * Este é o teste que pegou o bug.
   *
   * Ao commitar, um GUC customizado definido por `SET LOCAL` não volta a
   * NULL — volta a string vazia. E `''::uuid` não "não casa": estoura. Sem
   * `NULLIF` na política, uma conexão nova devolvia zero linhas e uma
   * reciclada por outro evento devolvia erro, na mesma pool.
   */
  it("conexão reciclada, que já serviu um evento, não estoura nem vaza", async () => {
    await comEvento(app, dados.a.eventoId, async (c) => {
      await c.query("SELECT count(*) FROM uploads");
    });

    // A mesma conexão volta para o pool carregando o GUC como ''.
    const cliente = await app.connect();
    try {
      const { rows } = await cliente.query("SELECT count(*)::int AS n FROM uploads");
      expect(rows[0]?.n).toBe(0);
    } finally {
      cliente.release();
    }
  });

  it("toda tabela devolve zero linhas", async () => {
    const cliente = await app.connect();
    try {
      for (const tabela of TABELAS_DE_EVENTO) {
        const { rows } = await cliente.query(`SELECT count(*)::int AS n FROM ${tabela}`);
        expect(rows[0].n, `${tabela} devolveu linha sem contexto de evento`).toBe(0);
      }
    } finally {
      cliente.release();
    }
  });
});

describe("4 — caminho de evento sem event_id falha alto", () => {
  it("string vazia é recusada antes de tocar no banco", async () => {
    await expect(comEvento(app, "", async () => 1)).rejects.toBeInstanceOf(ErroEventoAusente);
  });

  it("valor que não é uuid é recusado — não vira SELECT que devolve vazio", async () => {
    await expect(comEvento(app, "padrao", async () => 1)).rejects.toBeInstanceOf(ErroEventoAusente);
  });
});

describe("5 — o setting não vaza entre transações da mesma conexão", () => {
  it("duas transações seguidas na mesma conexão do pool", async () => {
    const soPool = app;

    const deA = await comEvento(soPool, dados.a.eventoId, async (c) => {
      const { rows } = await c.query("SELECT count(*)::int AS n FROM uploads");
      return rows[0].n as number;
    });

    // Sem SET LOCAL, esta segunda transação herdaria o setting da primeira —
    // que é exatamente o vazamento que o pooling em modo transação causa.
    const semContexto = await (async () => {
      const c = await soPool.connect();
      try {
        const { rows } = await c.query("SELECT count(*)::int AS n FROM uploads");
        return rows[0].n as number;
      } finally {
        c.release();
      }
    })();

    const deB = await comEvento(soPool, dados.b.eventoId, async (c) => {
      const { rows } = await c.query("SELECT event_id FROM uploads");
      return rows;
    });

    expect(deA).toBe(1);
    expect(semContexto).toBe(0);
    expect(deB).toHaveLength(1);
    expect(deB[0].event_id).toBe(dados.b.eventoId);
  });

  it("transações concorrentes de eventos diferentes não se enxergam", async () => {
    const [a, b] = await Promise.all([
      comEvento(app, dados.a.eventoId, async (c) => {
        const { rows } = await c.query("SELECT event_id FROM uploads");
        return rows;
      }),
      comEvento(app, dados.b.eventoId, async (c) => {
        const { rows } = await c.query("SELECT event_id FROM uploads");
        return rows;
      }),
    ]);

    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
    expect(a[0].event_id).toBe(dados.a.eventoId);
    expect(b[0].event_id).toBe(dados.b.eventoId);
  });
});

describe("6 — agregação cruza eventos, e fica auditada", () => {
  it("o papel BYPASSRLS enxerga os dois", async () => {
    const registros: { motivo: string; em: Date }[] = [];

    const total = await comAgregacao(
      agregador,
      "painel do fornecedor",
      (r) => registros.push(r),
      async (c) => {
        const { rows } = await c.query("SELECT count(*)::int AS n FROM uploads");
        return rows[0].n as number;
      },
    );

    expect(total).toBe(2);
    expect(registros).toHaveLength(1);
    expect(registros[0]?.motivo).toBe("painel do fornecedor");
  });

  it("agregação sem motivo é recusada — sem motivo não há auditoria", async () => {
    await expect(
      comAgregacao(agregador, "   ", () => {}, async () => 1),
    ).rejects.toThrow(/motivo/);
  });
});

/**
 * A única tabela com `event_id` que fica fora da RLS, e por quê.
 *
 * Resolver o token do convidado exige descobrir o `event_id`, e descobrir o
 * `event_id` exige o token resolvido. Circular. A saída é uma porta pequena
 * fora da política — e a disciplina é mantê-la pequena, o que o teste abaixo
 * impõe: qualquer coluna nova aqui reprova o CI.
 */
const FORA_DA_RLS = new Map([
  ["session_tokens", "porta de entrada: resolve token → event_id, antes de haver contexto"],
  ["event_slugs", "porta do QR: resolve slug → event_id. O slug não é segredo — está impresso na mesa"],
  ["wall_tokens", "porta da TV: resolve crachá → event_id, mesmo circular da sessão. Só leitura"],
  [
    "wall_pairings",
    "porta de pareamento da TV: nasce sem evento e ganha um quando alguém autoriza — resolve por código e por token de poll antes de haver contexto",
  ],
  [
    "app_pairings",
    "porta de pareamento web → app: resolve código → (event_id, session_id) antes de haver contexto — só mapeamento, sem PII",
  ],
  [
    "retention_jobs",
    "runner pós-evento: lista due cross-event sem PII de convidado — só event_id, kind e status",
  ],
  [
    "billing_payments",
    "cobrança Asaas: webhook marca pago e aplica plan sem app.event_id; sem PII de convidado",
  ],
  [
    "support_tickets",
    "inbox de suporte: event_id opcional; isolamento por app.account_id (conta), não por evento",
  ],
  [
    "event_members",
    "papéis couple/planner: isolamento por app.account_id (conta), não por evento do convidado",
  ],
]);

describe("7 — nenhuma tabela nova escapa da política", () => {
  it("a porta fora da RLS não cresce", async () => {
    const { rows } = await admin.query<{ coluna: string }>(
      `SELECT column_name AS coluna FROM information_schema.columns
       WHERE table_name = 'session_tokens' ORDER BY column_name`,
    );

    // Sem PII, sem nome de convidado, sem conteúdo de evento. Quem ler esta
    // tabela inteira sabe que existem sessões e a quais eventos pertencem —
    // e nada mais. Toda coluna a mais aqui está pedindo para sair da RLS.
    expect(rows.map((r) => r.coluna)).toEqual([
      "created_at",
      "event_id",
      "expires_at",
      "revoked_at",
      "session_id",
      "token_hash",
    ]);
  });

  it("a porta da parede não cresce, e não tem sessão", async () => {
    const { rows } = await admin.query<{ coluna: string }>(
      `SELECT column_name AS coluna FROM information_schema.columns
       WHERE table_name = 'wall_tokens' ORDER BY column_name`,
    );

    // Uma coluna a menos que `session_tokens`, e a ausência é a decisão: a
    // parede não é uma pessoa. Inventar `session_id` para ela faria a
    // auditoria atribuir a um convidado o que uma TV fez sozinha — e abriria
    // a porta para alguém reusar o crachá como sessão, que é o que autoriza
    // subir foto.
    expect(rows.map((r) => r.coluna)).toEqual([
      "created_at",
      "event_id",
      "expires_at",
      "revoked_at",
      "token_hash",
    ]);
  });

  it("a porta de pareamento não cresce, e não guarda nome nem conteúdo", async () => {
    const { rows } = await admin.query<{ coluna: string }>(
      `SELECT column_name AS coluna FROM information_schema.columns
       WHERE table_name = 'wall_pairings' ORDER BY column_name`,
    );

    // Só o mapeamento código/token → evento, mais o consentimento de quem ligou.
    // Nenhuma coluna de convidado, nenhuma foto. Quem ler esta tabela inteira
    // sabe que existem pareamentos e a quais eventos foram presos — nada além.
    expect(rows.map((r) => r.coluna)).toEqual([
      "code",
      "consent_version",
      "created_at",
      "event_id",
      "expires_at",
      "id",
      "poll_token_hash",
      "status",
    ]);
  });

  it("a porta de pareamento do app não cresce, e não guarda nome nem conteúdo", async () => {
    const { rows } = await admin.query<{ coluna: string }>(
      `SELECT column_name AS coluna FROM information_schema.columns
       WHERE table_name = 'app_pairings' ORDER BY column_name`,
    );

    // Só o mapeamento código → (event_id, session_id). Sem nome de convidado,
    // sem foto. Quem ler esta tabela inteira sabe que existem códigos de
    // pareamento e a quais sessões pertencem — nada além.
    expect(rows.map((r) => r.coluna)).toEqual([
      "code",
      "created_at",
      "event_id",
      "expires_at",
      "id",
      "session_id",
      "status",
    ]);
  });

  it("toda tabela com event_id tem RLS habilitado E forçado", async () => {
    const { rows } = await admin.query<{ tabela: string; ativo: boolean; forcado: boolean }>(`
      SELECT c.relname AS tabela, c.relrowsecurity AS ativo, c.relforcerowsecurity AS forcado
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND EXISTS (
          SELECT 1 FROM information_schema.columns col
          WHERE col.table_name = c.relname AND col.column_name = 'event_id'
        )
    `);

    expect(rows.length).toBeGreaterThan(0);
    for (const t of rows) {
      if (FORA_DA_RLS.has(t.tabela)) continue;
      expect(t.ativo, `${t.tabela} sem RLS habilitado`).toBe(true);
      // ENABLE sozinho não vale para o dono da tabela, e a aplicação costuma
      // conectar como dono. É o FORCE que fecha.
      expect(t.forcado, `${t.tabela} com RLS habilitado mas não FORÇADO`).toBe(true);
    }
  });

  it("toda tabela com event_id tem política que filtra por ele", async () => {
    const { rows } = await admin.query<{ tabela: string; expressao: string }>(`
      SELECT tablename AS tabela, qual::text AS expressao
      FROM pg_policies WHERE schemaname = 'public'
    `);

    const porTabela = new Map(rows.map((r) => [r.tabela, r.expressao]));

    for (const tabela of TABELAS_DE_EVENTO) {
      if (tabela === "events") continue;
      const expressao = porTabela.get(tabela);
      expect(expressao, `${tabela} sem política`).toBeTruthy();
      expect(expressao, `${tabela} não filtra por app.event_id`).toContain("app.event_id");
    }
  });

  it("events também está sob política, filtrando por id", async () => {
    const { rows } = await admin.query<{ expressao: string }>(
      "SELECT qual::text AS expressao FROM pg_policies WHERE tablename = 'events'",
    );

    // Desde o ADR 0013 há duas políticas em events (evento e conta); basta que
    // alguma feche por app.event_id.
    expect(rows.some((r) => r.expressao?.includes("app.event_id"))).toBe(true);
  });
});

describe("8 — a conta vê os seus eventos, e só os seus (ADR 0013)", () => {
  it("comConta enxerga o evento da conta, nunca o de outra", async () => {
    const daContaA = await comConta(app, dados.a.contaId, async (c) => {
      const { rows } = await c.query<{ id: string }>("SELECT id FROM events");
      return rows.map((r) => r.id);
    });

    expect(daContaA).toContain(dados.a.eventoId);
    expect(daContaA).not.toContain(dados.b.eventoId);
  });

  it("o caminho de evento não abre nada pela política de conta", async () => {
    // O convidado seta app.event_id, não app.account_id: a política de conta
    // vira account_id = NULL e não soma nada. Vê um evento, o do contexto.
    const vistos = await comEvento(app, dados.a.eventoId, async (c) => {
      const { rows } = await c.query<{ n: number }>("SELECT count(*)::int AS n FROM events");
      return rows[0]!.n;
    });

    expect(vistos).toBe(1);
  });

  it("uma conta não cria evento para outra — o WITH CHECK recusa", async () => {
    await expect(
      comConta(app, dados.a.contaId, async (c) => {
        await c.query(
          `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at)
           VALUES ($1, 'pack-um', 'roubado-de-b', now(), now() + interval '1 hour')`,
          [dados.b.contaId],
        );
      }),
    ).rejects.toThrow();

    // E nada foi criado: a recusa é antes da linha, não depois.
    const { rows } = await admin.query("SELECT id FROM events WHERE slug = 'roubado-de-b'");
    expect(rows).toHaveLength(0);
  });

  it("sem account_id válido, comConta falha alto — não assume padrão", async () => {
    await expect(comConta(app, "", async () => 1)).rejects.toThrow(/account/i);
  });
});

describe("9 — missão duplicada no mesmo evento é recusada pelo banco", () => {
  it("o segundo INSERT da mesma title_key no mesmo evento estoura UNIQUE", async () => {
    await comEvento(app, dados.a.eventoId, async (c) => {
      await c.query(
        "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3)",
        [dados.a.eventoId, "missao.unica", 1],
      );
    });

    await expect(
      comEvento(app, dados.a.eventoId, async (c) => {
        await c.query(
          "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3)",
          [dados.a.eventoId, "missao.unica", 2],
        );
      }),
    ).rejects.toMatchObject({ code: "23505", constraint: "challenges_event_id_title_key_key" });
  });

  it("a mesma chave em outro evento cabe — unicidade é por evento, não global", async () => {
    await comEvento(app, dados.a.eventoId, async (c) => {
      await c.query(
        "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3)",
        [dados.a.eventoId, "missao.nos-dois", 1],
      );
    });

    await expect(
      comEvento(app, dados.b.eventoId, async (c) => {
        await c.query(
          "INSERT INTO challenges (event_id, title_key, position) VALUES ($1, $2, $3)",
          [dados.b.eventoId, "missao.nos-dois", 1],
        );
      }),
    ).resolves.toBeUndefined();
  });
});

/**
 * 10 — canal do fornecedor: a mesma disciplina do event_id, agora para
 * vendor_id. Bloqueante (spec §6, riscos): `comAgregacao` nunca teve uso real
 * em produção até `eventosDoFornecedor`, e a contenção não é o GRANT do papel
 * `albora_agregador` (que tem SELECT em tudo) — é a query nunca sair sem
 * `WHERE vendor_id = $1`, atrás de uma primeira porta sob RLS normal.
 */
describe("10 — fornecedor: duas portas, nunca cruza vendor_id", () => {
  let vendorXId: string;
  let vendorYId: string;
  let membroXId: string;

  beforeAll(async () => {
    const { rows: vx } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ($1) RETURNING id",
      ["Fornecedor X"],
    );
    vendorXId = vx[0]!.id;
    const { rows: vy } = await admin.query<{ id: string }>(
      "INSERT INTO vendors (name) VALUES ($1) RETURNING id",
      ["Fornecedor Y"],
    );
    vendorYId = vy[0]!.id;

    // Os eventos A e B do seed principal (contas distintas, ADR 0013) passam
    // a pertencer a um fornecedor cada — o mesmo par que já prova isolamento
    // por event_id agora prova isolamento por vendor_id.
    await admin.query("UPDATE events SET vendor_id = $1 WHERE id = $2", [vendorXId, dados.a.eventoId]);
    await admin.query("UPDATE events SET vendor_id = $1 WHERE id = $2", [vendorYId, dados.b.eventoId]);

    const { rows: membro } = await admin.query<{ id: string }>(
      "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
      ["membro-fornecedor-x@exemplo.test"],
    );
    membroXId = membro[0]!.id;
    await admin.query(
      "INSERT INTO vendor_members (vendor_id, account_id, role) VALUES ($1, $2, 'admin')",
      [vendorXId, membroXId],
    );
  });

  it("eventosDoFornecedor nunca devolve evento de outro vendor_id", async () => {
    const eventos = await eventosDoFornecedor(app, agregador, membroXId, vendorXId, () => {});

    expect(eventos.map((e) => e.id)).toContain(dados.a.eventoId);
    expect(eventos.map((e) => e.id)).not.toContain(dados.b.eventoId);
  });

  it("a checagem de pertencimento roda sob RLS normal — bloqueia ANTES de auditar", async () => {
    const registros: { motivo: string; em: Date }[] = [];

    // dados.b.contaId é dono do evento B, mas não é vendor_members de X: a
    // primeira porta recusa antes de o agregador entrar em cena.
    await expect(
      eventosDoFornecedor(app, agregador, dados.b.contaId, vendorXId, (r) => registros.push(r)),
    ).rejects.toBeInstanceOf(ErroSemAcessoAoFornecedor);
    expect(registros).toHaveLength(0);
  });

  it("vendor_membro (RLS de vendors) só deixa o membro ver a própria linha", async () => {
    const vistoPeloMembro = await comConta(app, membroXId, async (c) => {
      const { rows } = await c.query<{ id: string }>("SELECT id FROM vendors");
      return rows.map((r) => r.id);
    });
    expect(vistoPeloMembro).toContain(vendorXId);
    expect(vistoPeloMembro).not.toContain(vendorYId);

    const vistoPorQuemNaoEMembro = await comConta(app, dados.b.contaId, async (c) => {
      const { rows } = await c.query<{ id: string }>("SELECT id FROM vendors");
      return rows.map((r) => r.id);
    });
    expect(vistoPorQuemNaoEMembro).toHaveLength(0);
  });

  it("a contenção é a query, não o GRANT do papel agregador", async () => {
    // O papel albora_agregador tem SELECT em toda tabela (migration 0002) —
    // por design, não por acidente. Sem o WHERE vendor_id = $1 que
    // eventosDoFornecedor sempre usa, uma consulta no MESMO papel veria os
    // dois vendors. Este teste documenta por que a disciplina tem de ser na
    // query de aplicação, nunca no GRANT.
    const registros: { motivo: string; em: Date }[] = [];
    const semFiltro = await comAgregacao(
      agregador,
      "teste:prova-de-contencao-por-query",
      (r) => registros.push(r),
      async (c) => {
        const { rows } = await c.query<{ vendor_id: string }>(
          "SELECT DISTINCT vendor_id FROM events WHERE vendor_id IS NOT NULL",
        );
        return rows.map((r) => r.vendor_id);
      },
    );
    expect(semFiltro).toEqual(expect.arrayContaining([vendorXId, vendorYId]));

    // eventosDoFornecedor, atrás do mesmo papel, nunca devolve isso: está
    // fechado por vendor_id = $1 com $1 já confirmado na primeira porta.
    const doX = await eventosDoFornecedor(app, agregador, membroXId, vendorXId, () => {});
    expect(doX.every((e) => e.id !== dados.b.eventoId)).toBe(true);
  });
});

