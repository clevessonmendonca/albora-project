import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { listarPostsDaComunidade } from "./comunidade-db";
import { prepararBanco } from "./testes/banco";

/**
 * O terceiro eixo de isolamento (ADR 0023). Os dois primeiros são por evento
 * (`app.event_id`, migration 0001) e por conta (`app.account_id`, 0013).
 *
 * Comunidade e Inspiração são dado de conta e **não** têm `event_id` — então
 * `rls-isolamento.test.ts`, que varre tabelas com `event_id`, não olha para
 * elas. Sem esta suíte, nada verifica a política mais perigosa do produto: a de
 * leitura do acervo compartilhado, que é permissiva de propósito.
 */

let admin: pg.Pool;
let app: pg.Pool;
let contaA: string;
let contaB: string;
let eventoA: string;
let ideia: string;

/** `SET LOCAL` sempre: o pool devolve a conexão a cada COMMIT e um `SET` de sessão vazaria para o próximo. */
async function comoConta<T>(
  contaId: string,
  executar: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const c = await app.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.account_id', $1, true)", [contaId]);
    const r = await executar(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** A sessão do convidado: `app.event_id` setado, `app.account_id` ausente. */
async function comoConvidado<T>(
  eventoId: string,
  executar: (c: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const c = await app.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.event_id', $1, true)", [eventoId]);
    const r = await executar(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Nenhum GUC: nem convidado, nem anfitrião. */
async function semContexto<T>(executar: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await app.connect();
  try {
    await c.query("BEGIN");
    const r = await executar(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
  app = pools.app;

  const conta = async (email: string) => {
    const { rows } = await admin.query("INSERT INTO accounts (email) VALUES ($1) RETURNING id", [
      email,
    ]);
    return rows[0].id as string;
  };
  contaA = await conta("comunidade-a@exemplo.test");
  contaB = await conta("comunidade-b@exemplo.test");

  await admin.query("INSERT INTO packs (id) VALUES ('pack-comunidade')");
  const { rows } = await admin.query(
    `INSERT INTO events (account_id, pack_id, slug, starts_at, ends_at, status)
     VALUES ($1, 'pack-comunidade', 'evento-comunidade', now(), now() + interval '6 hours', 'active')
     RETURNING id`,
    [contaA],
  );
  eventoA = rows[0].id as string;

  const ideias = await admin.query("SELECT id FROM inspiration_ideas ORDER BY position LIMIT 1");
  ideia = ideias.rows[0].id as string;

  await comoConta(contaA, (c) =>
    c.query(
      `INSERT INTO community_posts (account_id, topic, title, body)
       VALUES ($1, 'duvida', 'Post da conta A', 'Corpo do post da conta A')`,
      [contaA],
    ),
  );
  await comoConta(contaB, (c) =>
    c.query(
      `INSERT INTO community_posts (account_id, topic, title, body)
       VALUES ($1, 'ideia', 'Post da conta B', 'Corpo do post da conta B')`,
      [contaB],
    ),
  );
});

afterAll(async () => {
  await app?.end();
  await admin?.end();
});

describe("a comunidade é acervo compartilhado entre anfitriões", () => {
  it("um anfitrião lê o post do outro — é isso que faz dela um fórum", async () => {
    const { rows } = await comoConta(contaA, (c) =>
      c.query("SELECT title FROM community_posts ORDER BY title"),
    );

    expect(rows.map((r) => r.title)).toEqual(["Post da conta A", "Post da conta B"]);
  });

  it("o acervo editorial de inspiração é visível a qualquer anfitrião", async () => {
    const { rows } = await comoConta(contaB, (c) =>
      c.query("SELECT count(*)::int AS n FROM inspiration_ideas"),
    );

    expect(rows[0].n).toBeGreaterThan(0);
  });
});

describe("🔴 o convidado não alcança a comunidade", () => {
  it("sessão de convidado não lê nenhum post", async () => {
    const { rows } = await comoConvidado(eventoA, (c) =>
      c.query("SELECT count(*)::int AS n FROM community_posts"),
    );

    expect(rows[0].n).toBe(0);
  });

  it("sessão de convidado não lê nenhuma resposta", async () => {
    const { rows } = await comoConvidado(eventoA, (c) =>
      c.query("SELECT count(*)::int AS n FROM community_replies"),
    );

    expect(rows[0].n).toBe(0);
  });

  it("sessão de convidado não lê o acervo de inspiração", async () => {
    const { rows } = await comoConvidado(eventoA, (c) =>
      c.query("SELECT count(*)::int AS n FROM inspiration_ideas"),
    );

    expect(rows[0].n).toBe(0);
  });

  it("sessão de convidado não consegue escrever post", async () => {
    await expect(
      comoConvidado(eventoA, (c) =>
        c.query(
          `INSERT INTO community_posts (account_id, topic, title, body)
           VALUES ($1, 'duvida', 'Do convidado', 'Não deveria entrar')`,
          [contaA],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("sem contexto nenhum, nada aparece", () => {
  it("sem GUC de conta, a leitura devolve zero", async () => {
    const { rows } = await semContexto((c) =>
      c.query("SELECT count(*)::int AS n FROM community_posts"),
    );

    expect(rows[0].n).toBe(0);
  });
});

describe("dentro da comunidade, a linha é de quem escreveu", () => {
  it("a conta A não apaga post da conta B", async () => {
    const { rowCount } = await comoConta(contaA, (c) =>
      c.query("DELETE FROM community_posts WHERE title = 'Post da conta B'"),
    );

    expect(rowCount).toBe(0);
  });

  it("a conta A não edita post da conta B", async () => {
    const { rowCount } = await comoConta(contaA, (c) =>
      c.query("UPDATE community_posts SET body = 'sequestrado' WHERE title = 'Post da conta B'"),
    );

    expect(rowCount).toBe(0);
  });

  it("a conta A não cria post no nome da conta B", async () => {
    await expect(
      comoConta(contaA, (c) =>
        c.query(
          `INSERT INTO community_posts (account_id, topic, title, body)
           VALUES ($1, 'duvida', 'Forjado', 'Em nome de outra conta')`,
          [contaB],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("a conta A apaga o próprio post", async () => {
    const id = await comoConta(contaA, async (c) => {
      const { rows } = await c.query(
        `INSERT INTO community_posts (account_id, topic, title, body)
         VALUES ($1, 'indicacao', 'Descartável', 'Para apagar') RETURNING id`,
        [contaA],
      );
      return rows[0].id as string;
    });

    const { rowCount } = await comoConta(contaA, (c) =>
      c.query("DELETE FROM community_posts WHERE id = $1", [id]),
    );

    expect(rowCount).toBe(1);
  });
});

describe("o acervo editorial não é escrito pela aplicação", () => {
  it("nem o próprio anfitrião insere ideia", async () => {
    await expect(
      comoConta(contaA, (c) =>
        c.query(
          `INSERT INTO inspiration_ideas (slug, theme, title, body)
           VALUES ('invadida', 'fotos', 'Minha ideia', 'Não deveria entrar')`,
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});

describe("salvos são privados", () => {
  it("a conta B não vê o que a conta A salvou", async () => {
    await comoConta(contaA, (c) =>
      c.query("INSERT INTO inspiration_saves (account_id, idea_id) VALUES ($1, $2)", [
        contaA,
        ideia,
      ]),
    );

    const { rows } = await comoConta(contaB, (c) =>
      c.query("SELECT count(*)::int AS n FROM inspiration_saves"),
    );

    expect(rows[0].n).toBe(0);
  });
});

describe("o feed pagina por chave, não por OFFSET", () => {
  /** Conversa nova entra no topo entre uma página e a seguinte — é o caso que `OFFSET` erra. */
  it("não pula nem repete quando chega post novo entre as páginas", async () => {
    // Limpa pelo pool admin: sob `comoConta` a RLS protege (com razão) a linha
    // da outra conta, e ela sobraria no feed compartilhado.
    await admin.query("DELETE FROM community_posts");

    const conta = await comoConta(contaA, async (c) => {
      for (let i = 0; i < 6; i += 1) {
        await c.query(
          `INSERT INTO community_posts (account_id, topic, title, body, created_at)
           VALUES ($1, 'ideia', $2, 'corpo', now() - ($3 || ' minutes')::interval)`,
          [contaA, `post ${i}`, String(i)],
        );
      }
      return contaA;
    });

    const primeira = await comoConta(conta, (c) =>
      listarPostsDaComunidade(c, conta, { limite: 3 }),
    );
    expect(primeira.map((p) => p.titulo)).toEqual(["post 0", "post 1", "post 2"]);

    // Alguém publica enquanto a pessoa lê a primeira página.
    await comoConta(conta, (c) =>
      c.query(
        `INSERT INTO community_posts (account_id, topic, title, body)
         VALUES ($1, 'ideia', 'recém-chegado', 'corpo')`,
        [conta],
      ),
    );

    const ultimo = primeira[primeira.length - 1]!;
    const segunda = await comoConta(conta, (c) =>
      listarPostsDaComunidade(c, conta, {
        limite: 3,
        antesDe: { criadoEm: ultimo.criadoEm, id: ultimo.id },
      }),
    );

    expect(segunda.map((p) => p.titulo)).toEqual(["post 3", "post 4", "post 5"]);
    expect(segunda.map((p) => p.titulo)).not.toContain("post 2");
    expect(segunda.map((p) => p.titulo)).not.toContain("recém-chegado");
  });
});
