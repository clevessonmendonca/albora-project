import { VENDOR_PLAN_TEAM_LIMIT, type VendorPlanTier } from "@albora/core";
import type { Pool, PoolClient } from "pg";
import { comAgregacao } from "./event";
import { roleForAccountOnVendor, type VendorRole } from "./vendor-portal";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VendorTeamMember = {
  accountId: string;
  email: string;
  role: VendorRole;
  createdAt: Date;
};

export class VendorTeamAccessError extends Error {
  readonly code = "vendor.team.access_denied";
  constructor() {
    super("somente admin do fornecedor pode gerenciar a equipe");
  }
}

export class VendorTeamLimitError extends Error {
  readonly code = "vendor.team.limit_reached";
  constructor(readonly limit: number) {
    super(`o plano permite até ${limit} pessoa(s) na equipe`);
  }
}

export class VendorTeamSelfManagementError extends Error {
  readonly code = "vendor.team.self_management";
  constructor() {
    super("o administrador não pode alterar o próprio acesso por esta tela");
  }
}

async function requireVendorAdmin(pool: Pool, accountId: string, vendorId: string): Promise<void> {
  if (!UUID.test(accountId) || !UUID.test(vendorId)) throw new VendorTeamAccessError();
  const role = await roleForAccountOnVendor(pool, accountId, vendorId);
  if (role !== "admin") throw new VendorTeamAccessError();
}

async function selectMembers(client: PoolClient, vendorId: string): Promise<VendorTeamMember[]> {
  const { rows } = await client.query<{
    account_id: string;
    email: string;
    role: VendorRole;
    created_at: Date;
  }>(
    `SELECT vm.account_id, a.email, vm.role, vm.created_at
       FROM vendor_members vm
       JOIN accounts a ON a.id = vm.account_id
      WHERE vm.vendor_id = $1
      ORDER BY CASE vm.role WHEN 'admin' THEN 0 ELSE 1 END, vm.created_at ASC`,
    [vendorId],
  );
  return rows.map((row) => ({
    accountId: row.account_id,
    email: row.email,
    role: row.role,
    createdAt: row.created_at,
  }));
}

/** Lista PII apenas depois do portão de admin e sempre pela porta agregadora auditada. */
export async function listVendorTeam(
  poolAccount: Pool,
  poolAggregator: Pool,
  actorAccountId: string,
  vendorId: string,
  audit: (record: { motivo: string; em: Date }) => void,
): Promise<VendorTeamMember[]> {
  await requireVendorAdmin(poolAccount, actorAccountId, vendorId);
  return comAgregacao(poolAggregator, `vendor_team:list:${vendorId}`, audit, (client) =>
    selectMembers(client, vendorId),
  );
}

/** Adiciona ou troca o papel. O lock por fornecedor fecha corrida no limite do plano. */
export async function upsertVendorTeamMember(
  poolAccount: Pool,
  poolAggregator: Pool,
  input: {
    actorAccountId: string;
    vendorId: string;
    targetAccountId: string;
    role: VendorRole;
  },
  audit: (record: { motivo: string; em: Date }) => void,
): Promise<VendorTeamMember[]> {
  await requireVendorAdmin(poolAccount, input.actorAccountId, input.vendorId);
  if (!UUID.test(input.targetAccountId)) throw new VendorTeamAccessError();
  if (input.targetAccountId === input.actorAccountId) throw new VendorTeamSelfManagementError();

  return comAgregacao(
    poolAggregator,
    `vendor_team:upsert:${input.vendorId}`,
    audit,
    async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.vendorId]);
      const { rows: vendorRows } = await client.query<{ plan: VendorPlanTier }>(
        "SELECT plan FROM vendors WHERE id = $1",
        [input.vendorId],
      );
      const plan = vendorRows[0]?.plan;
      if (!plan) throw new VendorTeamAccessError();

      const { rows: existingRows } = await client.query<{ role: VendorRole }>(
        "SELECT role FROM vendor_members WHERE vendor_id = $1 AND account_id = $2",
        [input.vendorId, input.targetAccountId],
      );
      const existing = existingRows[0];
      if (!existing) {
        const limit = VENDOR_PLAN_TEAM_LIMIT[plan];
        if (limit !== null) {
          const { rows: countRows } = await client.query<{ total: number }>(
            "SELECT count(*)::int AS total FROM vendor_members WHERE vendor_id = $1",
            [input.vendorId],
          );
          if ((countRows[0]?.total ?? 0) >= limit) throw new VendorTeamLimitError(limit);
        }
      }

      await client.query(
        `INSERT INTO vendor_members (vendor_id, account_id, role)
         VALUES ($1, $2, $3)
         ON CONFLICT (vendor_id, account_id) DO UPDATE SET role = EXCLUDED.role`,
        [input.vendorId, input.targetAccountId, input.role],
      );
      return selectMembers(client, input.vendorId);
    },
  );
}

export async function removeVendorTeamMember(
  poolAccount: Pool,
  poolAggregator: Pool,
  input: { actorAccountId: string; vendorId: string; targetAccountId: string },
  audit: (record: { motivo: string; em: Date }) => void,
): Promise<VendorTeamMember[] | null> {
  await requireVendorAdmin(poolAccount, input.actorAccountId, input.vendorId);
  if (!UUID.test(input.targetAccountId)) throw new VendorTeamAccessError();
  if (input.targetAccountId === input.actorAccountId) throw new VendorTeamSelfManagementError();

  return comAgregacao(
    poolAggregator,
    `vendor_team:remove:${input.vendorId}`,
    audit,
    async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [input.vendorId]);
      const result = await client.query(
        "DELETE FROM vendor_members WHERE vendor_id = $1 AND account_id = $2",
        [input.vendorId, input.targetAccountId],
      );
      if ((result.rowCount ?? 0) === 0) return null;
      return selectMembers(client, input.vendorId);
    },
  );
}

export async function updateVendorTeamMemberRole(
  poolAccount: Pool,
  poolAggregator: Pool,
  input: {
    actorAccountId: string;
    vendorId: string;
    targetAccountId: string;
    role: VendorRole;
  },
  audit: (record: { motivo: string; em: Date }) => void,
): Promise<VendorTeamMember[] | null> {
  await requireVendorAdmin(poolAccount, input.actorAccountId, input.vendorId);
  if (!UUID.test(input.targetAccountId)) throw new VendorTeamAccessError();
  if (input.targetAccountId === input.actorAccountId) throw new VendorTeamSelfManagementError();

  return comAgregacao(
    poolAggregator,
    `vendor_team:update_role:${input.vendorId}`,
    audit,
    async (client) => {
      const result = await client.query(
        "UPDATE vendor_members SET role = $3 WHERE vendor_id = $1 AND account_id = $2",
        [input.vendorId, input.targetAccountId, input.role],
      );
      if ((result.rowCount ?? 0) === 0) return null;
      return selectMembers(client, input.vendorId);
    },
  );
}
