import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";

/**
 * O teste que `tools/guards/isolamento.mjs` promete no próprio docstring e que
 * nunca existiu. O guard estático pega `SET` no lugar de `SET LOCAL`; nada
 * pegava tabela de evento nascendo sem política. Uma tabela esquecida não
 * quebra teste nenhum: ela só passa a devolver linha de outro evento.
 */

/**
 * As portas: tabelas com `event_id` que ficam FORA da RLS de propósito, porque
 * são consultadas ANTES de se saber qual é o evento. RLS por `app.event_id`
 * ali tornaria a linha invisível para sempre — o GUC está vazio nesse momento,
 * e `event_id = NULL` nunca é verdadeiro.
 *
 * Cada entrada cita a migration que declara a decisão. Exceção sem motivo
 * escrito é esquecimento com aparência de decisão.
 */
const PORTAS = new Map<string, string>([
  [
    "session_tokens",
    "0003 — o servidor descobre o event_id resolvendo o hash do token; exigir event_id para ler a tabela que o contém é circular",
  ],
  [
    "event_slugs",
    "0004 — o QR entrega slug, não event_id; resolver o slug é o primeiro toque de qualquer convidado",
  ],
  [
    "wall_tokens",
    "0007 — o telão se autentica por token antes de haver contexto de evento",
  ],
  [
    "wall_pairings",
    "0010 — a linha nasce com event_id NULL: o pareamento começa antes de o evento ser escolhido",
  ],
  [
    "app_pairings",
    "0021 — o resgate do código do app acontece fora do contexto de evento, como a sessão",
  ],
  [
    "retention_jobs",
    "0033 — o runner lê cross-event por desenho; o isolamento vem do papel dedicado e do filtro explícito por event_id em cada leitura escopada",
  ],
  [
    "billing_payments",
    "0031 — cobrança é dado de conta; event_id é referência, e a leitura é por account_id ou pelo id do provedor",
  ],
]);

type Tabela = {
  nome: string;
  rlsLigada: boolean;
  rlsForcada: boolean;
  politicas: number;
};

let admin: pg.Pool;
let tabelas: Tabela[];

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;

  const { rows } = await admin.query<{
    relname: string;
    relrowsecurity: boolean;
    relforcerowsecurity: boolean;
    politicas: string;
  }>(`
    SELECT c.relname,
           c.relrowsecurity,
           c.relforcerowsecurity,
           (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS politicas
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND EXISTS (
             SELECT 1 FROM pg_attribute a
              WHERE a.attrelid = c.oid AND a.attname = 'event_id' AND NOT a.attisdropped
           )
     ORDER BY c.relname`);

  tabelas = rows.map((l) => ({
    nome: l.relname,
    rlsLigada: l.relrowsecurity,
    rlsForcada: l.relforcerowsecurity,
    politicas: Number(l.politicas),
  }));
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

describe("isolamento por evento no schema", () => {
  it("existem tabelas com event_id para verificar", () => {
    expect(tabelas.length).toBeGreaterThan(20);
  });

  it("toda tabela com event_id tem RLS, FORÇADA e com política — salvo as portas declaradas", () => {
    const desprotegidas = tabelas
      .filter((t) => !PORTAS.has(t.nome))
      .filter((t) => !t.rlsLigada || !t.rlsForcada || t.politicas === 0)
      .map((t) => `${t.nome} (rls=${t.rlsLigada} forcada=${t.rlsForcada} políticas=${t.politicas})`);

    expect(desprotegidas).toEqual([]);
  });

  it("ENABLE sem FORCE não vale: a aplicação costuma conectar como dono da tabela", () => {
    const soHabilitadas = tabelas
      .filter((t) => t.rlsLigada && !t.rlsForcada)
      .map((t) => t.nome);

    expect(soHabilitadas).toEqual([]);
  });

  it("toda política de evento usa NULLIF — sem ele o GUC vazio estoura em vez de falhar fechado", async () => {
    const { rows } = await admin.query<{ tabela: string; expressao: string }>(`
      SELECT c.relname AS tabela, pg_get_expr(p.polqual, p.polrelid) AS expressao
        FROM pg_policy p
        JOIN pg_class c ON c.oid = p.polrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND pg_get_expr(p.polqual, p.polrelid) LIKE '%app.event_id%'`);

    const semNullif = rows
      .filter((r) => !r.expressao.toLowerCase().includes("nullif"))
      .map((r) => `${r.tabela}: ${r.expressao}`);

    expect(rows.length).toBeGreaterThan(0);
    expect(semNullif).toEqual([]);
  });
});

describe("as portas declaradas", () => {
  it("cada porta ainda existe no schema", () => {
    const nomes = new Set(tabelas.map((t) => t.nome));
    const fantasmas = [...PORTAS.keys()].filter((p) => !nomes.has(p));

    expect(fantasmas).toEqual([]);
  });

  it("cada porta continua fora da RLS: ganhar política sem revisar a lista é regressão silenciosa", () => {
    const mudaram = tabelas
      .filter((t) => PORTAS.has(t.nome))
      .filter((t) => t.rlsLigada || t.politicas > 0)
      .map((t) => t.nome);

    expect(mudaram).toEqual([]);
  });

  it("cada porta diz por que é porta, e cita a migration que decidiu", () => {
    for (const [tabela, motivo] of PORTAS) {
      expect(motivo.length, `${tabela} sem motivo`).toBeGreaterThan(40);
      expect(motivo, `${tabela} não cita migration`).toMatch(/^\d{4} — /);
    }
  });
});
