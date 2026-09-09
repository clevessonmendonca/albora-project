import type pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prepararBanco } from "./testes/banco";
import {
  listVendorTeam,
  removeVendorTeamMember,
  updateVendorTeamMemberRole,
  upsertVendorTeamMember,
  VendorTeamAccessError,
  VendorTeamLimitError,
  VendorTeamSelfManagementError,
} from "./vendor-team";

let adminPool: pg.Pool;
let appPool: pg.Pool;
let aggregatorPool: pg.Pool;
let vendorId: string;
let adminId: string;
let staffId: string;

async function account(email: string): Promise<string> {
  const { rows } = await adminPool.query<{ id: string }>(
    "INSERT INTO accounts (email) VALUES ($1) RETURNING id",
    [email],
  );
  return rows[0]!.id;
}

beforeAll(async () => {
  const pools = await prepararBanco();
  adminPool = pools.admin;
  appPool = pools.app;
  aggregatorPool = pools.agregador;
  adminId = await account("admin-equipe@exemplo.test");
  staffId = await account("staff-equipe@exemplo.test");
  const vendor = await adminPool.query<{ id: string }>(
    "INSERT INTO vendors (name, plan) VALUES ('Equipe teste', 'studio') RETURNING id",
  );
  vendorId = vendor.rows[0]!.id;
  await adminPool.query(
    "INSERT INTO vendor_members (vendor_id, account_id, role) VALUES ($1, $2, 'admin'), ($1, $3, 'staff')",
    [vendorId, adminId, staffId],
  );
}, 60_000);

afterAll(async () => {
  await Promise.all([adminPool?.end(), appPool?.end(), aggregatorPool?.end()]);
});

describe("vendor team", () => {
  it("lista PII somente para admin confirmado pela conexão comum", async () => {
    const members = await listVendorTeam(appPool, aggregatorPool, adminId, vendorId, () => {});
    expect(members.map((member) => member.email)).toEqual([
      "admin-equipe@exemplo.test",
      "staff-equipe@exemplo.test",
    ]);
    await expect(
      listVendorTeam(appPool, aggregatorPool, staffId, vendorId, () => {}),
    ).rejects.toBeInstanceOf(VendorTeamAccessError);
  });

  it("UPDATE estrito não cria vínculo para conta fora da equipe", async () => {
    const outsiderId = await account("fora-equipe@exemplo.test");
    const result = await updateVendorTeamMemberRole(
      appPool,
      aggregatorPool,
      { actorAccountId: adminId, vendorId, targetAccountId: outsiderId, role: "admin" },
      () => {},
    );
    expect(result).toBeNull();
    const rows = await adminPool.query(
      "SELECT 1 FROM vendor_members WHERE vendor_id = $1 AND account_id = $2",
      [vendorId, outsiderId],
    );
    expect(rows.rowCount).toBe(0);
  });

  it("impede autogestão e respeita o limite do plano dentro da transação", async () => {
    await expect(
      removeVendorTeamMember(
        appPool,
        aggregatorPool,
        { actorAccountId: adminId, vendorId, targetAccountId: adminId },
        () => {},
      ),
    ).rejects.toBeInstanceOf(VendorTeamSelfManagementError);

    for (let index = 0; index < 3; index += 1) {
      const memberId = await account(`extra-${index}@exemplo.test`);
      await upsertVendorTeamMember(
        appPool,
        aggregatorPool,
        { actorAccountId: adminId, vendorId, targetAccountId: memberId, role: "staff" },
        () => {},
      );
    }
    const sixthId = await account("sexto@exemplo.test");
    await expect(
      upsertVendorTeamMember(
        appPool,
        aggregatorPool,
        { actorAccountId: adminId, vendorId, targetAccountId: sixthId, role: "staff" },
        () => {},
      ),
    ).rejects.toBeInstanceOf(VendorTeamLimitError);
  });
});
