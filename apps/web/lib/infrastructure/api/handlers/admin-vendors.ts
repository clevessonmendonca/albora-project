import { vendorsDaConta } from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  jsonOk,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

/** Fornecedores que a conta administra ou é staff — alimenta o wizard de criação (spec §2.4); lista vazia é o caso comum, nunca 404. */
export async function GET(req: Request) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  try {
    const vendors = await vendorsDaConta(getPool(), auth.host.accountId);
    return jsonOk({ vendors });
  } catch (e) {
    return unexpectedError("admin.vendors", e);
  }
}
