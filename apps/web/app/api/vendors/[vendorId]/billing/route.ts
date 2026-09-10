import { VendorTeamAccessError } from "@albora/db";
import { loadVendorBilling, vendorBillingDependencies } from "@/lib/application/use-cases/vendor-billing";
import {
  ADMIN_SESSION_REQUIRED,
  UUID_RE,
  errorResponse,
  jsonOk,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;
  const { vendorId } = await params;
  if (!UUID_RE.test(vendorId)) return errorResponse(404, "vendor.billing.not_found", "Cobrança não encontrada");
  try {
    return jsonOk(await loadVendorBilling(vendorBillingDependencies(), auth.host, vendorId));
  } catch (error) {
    if (error instanceof VendorTeamAccessError) return errorResponse(404, error.code, "Cobrança não encontrada");
    return unexpectedError("vendor.billing.read", error);
  }
}
