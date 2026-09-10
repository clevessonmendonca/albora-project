import { issueMarkedHostSession, resolveOrCreateAccountByEmail } from "@albora/db";
import { Pool } from "pg";
import type { BrowserContext } from "@playwright/test";

function requireTestDatabaseUrl(): string {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("TEST_DATABASE_URL é obrigatória no E2E do fornecedor");
  }
  return databaseUrl;
}

export type VendorE2EActor = {
  accountId: string;
  email: string;
  token: string;
};

export async function createVendorE2EActor(): Promise<VendorE2EActor> {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) throw new Error("SESSION_SECRET é obrigatório no E2E do fornecedor");

  const pool = new Pool({ connectionString: requireTestDatabaseUrl() });
  const email = `vendor-e2e-${crypto.randomUUID()}@albora.test`;
  try {
    const account = await resolveOrCreateAccountByEmail(pool, email);
    const session = await issueMarkedHostSession(
      pool,
      sessionSecret,
      account.accountId,
      null,
      new Date(Date.now() + 60 * 60 * 1000),
    );
    return { accountId: account.accountId, email, token: session.token };
  } finally {
    await pool.end();
  }
}

export async function authenticateVendorE2EActor(
  context: BrowserContext,
  actor: VendorE2EActor,
): Promise<void> {
  const appUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
  await context.addCookies([
    {
      name: "albora_host",
      value: actor.token,
      url: appUrl,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

export async function cleanupVendorE2EActor(actor: VendorE2EActor): Promise<void> {
  const pool = new Pool({ connectionString: requireTestDatabaseUrl() });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const vendors = await client.query<{ vendor_id: string }>(
      "SELECT vendor_id FROM vendor_members WHERE account_id = $1",
      [actor.accountId],
    );
    const vendorIds = vendors.rows.map((row) => row.vendor_id);
    if (vendorIds.length > 0) {
      const owners = await client.query<{ account_id: string }>(
        "SELECT DISTINCT account_id FROM events WHERE vendor_id = ANY($1::uuid[])",
        [vendorIds],
      );
      await client.query("DELETE FROM events WHERE vendor_id = ANY($1::uuid[])", [vendorIds]);
      await client.query("DELETE FROM vendors WHERE id = ANY($1::uuid[])", [vendorIds]);
      const ownerIds = owners.rows.map((row) => row.account_id);
      if (ownerIds.length > 0) {
        await client.query("DELETE FROM accounts WHERE id = ANY($1::uuid[])", [ownerIds]);
      }
    }
    await client.query("DELETE FROM accounts WHERE id = $1", [actor.accountId]);
    await client.query("COMMIT");
  } catch (cause) {
    await client.query("ROLLBACK").catch(() => {});
    throw cause;
  } finally {
    client.release();
    await pool.end();
  }
}
