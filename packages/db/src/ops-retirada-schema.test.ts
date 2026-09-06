import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";

let admin: pg.Pool;

beforeAll(async () => {
  const pools = await prepararBanco();
  admin = pools.admin;
}, 60_000);

afterAll(async () => {
  await admin?.end();
});

describe("migration 0064", () => {
  it("ops_ticket_lista não existe mais em support_tickets", async () => {
    await prepararBanco();
    const { rows } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'ops_ticket_lista'`,
    );
    expect(rows).toHaveLength(0);
  });

  it("conta_ticket (leitura do próprio host) continua valendo em support_tickets", async () => {
    await prepararBanco();
    const { rows } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'conta_ticket'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("staff_mutation_ticket (escrita de staff, migration 0063) continua valendo", async () => {
    await prepararBanco();
    const { rows } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'support_tickets' AND policyname = 'staff_mutation_ticket'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("platform_operators continua existindo, com sua própria policy de leitura — a migration NÃO derruba a tabela", async () => {
    await prepararBanco();
    const { rows: tabela } = await admin.query(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_operators'`,
    );
    expect(tabela).toHaveLength(1);

    const { rows: policy } = await admin.query(
      `SELECT 1 FROM pg_policies WHERE tablename = 'platform_operators' AND policyname = 'conta_operator'`,
    );
    expect(policy).toHaveLength(1);
  });
});
