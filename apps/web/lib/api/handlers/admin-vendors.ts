import { vendorsDaConta } from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  jsonOk,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

/**
 * Fornecedores que a conta logada administra ou em que atua como staff —
 * alimenta o passo condicional do wizard de criação de evento
 * (spec-canal-fornecedor §2, item 4). Lista vazia é o caso comum (a maioria
 * dos anfitriões não é fornecedor); nunca 404/erro por isso.
 */
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
