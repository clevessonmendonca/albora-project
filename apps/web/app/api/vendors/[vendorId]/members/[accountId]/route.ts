import { VendorTeamAccessError, VendorTeamSelfManagementError } from "@albora/db";
import {
  deleteVendorTeamMember,
  updateVendorTeamMemberRole,
  vendorTeamDependencies,
} from "@/lib/application/use-cases/vendor-team";
import {
  ADMIN_SESSION_REQUIRED,
  UUID_RE,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";
type PatchBody = { role?: unknown };
type RouteParams = { params: Promise<{ vendorId: string; accountId: string }> };

function knownError(error: unknown): Response | null {
  if (error instanceof VendorTeamAccessError) return errorResponse(404, error.code, "Membro não encontrado");
  if (error instanceof VendorTeamSelfManagementError) {
    return errorResponse(422, error.code, "Seu próprio acesso não pode ser alterado aqui");
  }
  return null;
}

async function context(req: Request, vendorId: string, accountId: string) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;
  if (!UUID_RE.test(vendorId) || !UUID_RE.test(accountId)) {
    return errorResponse(404, "vendor.team.member_not_found", "Membro não encontrado");
  }
  const rate = consume(`vendor_team_change:${auth.host.accountId}`, 30, 60, Date.now());
  if (!rate.allowed) return errorResponse(429, "limite.excedido", "Espere um instante e tente novamente");
  return auth;
}

export async function PATCH(req: Request, route: RouteParams) {
  const { vendorId, accountId } = await route.params;
  const auth = await context(req, vendorId, accountId);
  if (auth instanceof Response) return auth;
  const parsed = await parseJsonBody<PatchBody>(req);
  if (parsed instanceof Response) return parsed;
  const role = parsed.data.role;
  if (role !== "admin" && role !== "staff") {
    return errorResponse(422, "validation_error", "Escolha um papel válido", { campos: ["role"] });
  }
  try {
    const members = await updateVendorTeamMemberRole(vendorTeamDependencies(), auth.host, {
      vendorId,
      accountId,
      role,
    });
    return jsonOk({ members });
  } catch (error) {
    return knownError(error) ?? unexpectedError("vendor.team.role", error);
  }
}

export async function DELETE(req: Request, route: RouteParams) {
  const { vendorId, accountId } = await route.params;
  const auth = await context(req, vendorId, accountId);
  if (auth instanceof Response) return auth;
  try {
    const members = await deleteVendorTeamMember(vendorTeamDependencies(), auth.host, {
      vendorId,
      accountId,
    });
    if (!members) return errorResponse(404, "vendor.team.member_not_found", "Membro não encontrado");
    return jsonOk({ members });
  } catch (error) {
    return knownError(error) ?? unexpectedError("vendor.team.remove", error);
  }
}
