import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

describe("migration 0070 — entrega das fotos", () => {
  it("delivery_tokens e guest_magic_links existem como porta-de-entrada, fora da RLS (padrão session_tokens)", async () => {
    const { rows } = await admin.query<{ tabela: string; ativo: boolean; forcado: boolean }>(`
      SELECT c.relname AS tabela, c.relrowsecurity AS ativo, c.relforcerowsecurity AS forcado
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relkind = 'r'
        AND c.relname IN ('delivery_tokens', 'guest_magic_links')
    `);

    expect(rows).toHaveLength(2);
    for (const t of rows) {
      expect(t.ativo, `${t.tabela} deveria estar fora da RLS (porta de entrada)`).toBe(false);
      expect(t.forcado, `${t.tabela} deveria estar fora da RLS (porta de entrada)`).toBe(false);
    }
  });

  it("events.delivery_opens_at e guest_contacts.delivered_at existem e são nulláveis", async () => {
    const { rows } = await admin.query<{
      tabela: string;
      coluna: string;
      nullable: string;
    }>(`
      SELECT table_name AS tabela, column_name AS coluna, is_nullable AS nullable
      FROM information_schema.columns
      WHERE (table_name = 'events' AND column_name = 'delivery_opens_at')
         OR (table_name = 'guest_contacts' AND column_name = 'delivered_at')
    `);

    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.nullable, `${r.tabela}.${r.coluna} deveria ser nullável`).toBe("YES");
    }
  });
});
