import { VendorTeamAccessError, VendorTeamLimitError, VendorTeamSelfManagementError } from "@albora/db";
import {
  inviteVendorTeamMember,
  loadVendorTeam,
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
type PostBody = { email?: unknown; role?: unknown };

function knownError(error: unknown): Response | null {
  if (error instanceof VendorTeamAccessError) {
    return errorResponse(404, error.code, "Equipe não encontrada");
  }
  if (error instanceof VendorTeamLimitError) {
    return errorResponse(409, error.code, "Seu plano atingiu o limite de pessoas", {
      limit: error.limit,
    });
  }
  if (error instanceof VendorTeamSelfManagementError) {
    return errorResponse(422, error.code, "Seu próprio acesso não pode ser alterado aqui");
  }
  return null;
}

async function context(req: Request, vendorId: string) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;
  if (!UUID_RE.test(vendorId)) return errorResponse(404, "vendor.nao_encontrado", "Equipe não encontrada");
  return auth;
}

export async function GET(req: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const auth = await context(req, vendorId);
  if (auth instanceof Response) return auth;
  try {
    const result = await loadVendorTeam(vendorTeamDependencies(), auth.host, vendorId);
    return jsonOk({ members: result.members, teamLimit: result.teamLimit });
  } catch (error) {
    return knownError(error) ?? unexpectedError("vendor.team.list", error);
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ vendorId: string }> }) {
  const { vendorId } = await params;
  const auth = await context(req, vendorId);
  if (auth instanceof Response) return auth;
  const rate = consume(`vendor_team_invite:${auth.host.accountId}`, 10, 60, Date.now());
  if (!rate.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante antes de convidar novamente", {
      retry_after_seconds: rate.resetInSeconds,
    });
  }
  const parsed = await parseJsonBody<PostBody>(req);
  if (parsed instanceof Response) return parsed;
  const email = typeof parsed.data.email === "string" ? parsed.data.email.trim() : "";
  const role = parsed.data.role;
  if (!EMAIL.test(email) || email.length > 320) {
    return errorResponse(422, "validation_error", "Informe um e-mail válido", { campos: ["email"] });
  }
  if (role !== "admin" && role !== "staff") {
    return errorResponse(422, "validation_error", "Escolha um papel válido", { campos: ["role"] });
  }
  try {
    const members = await inviteVendorTeamMember(vendorTeamDependencies(), auth.host, {
      vendorId,
      email,
      role,
      origin: new URL(req.url).origin,
    });
    return jsonOk({ members });
  } catch (error) {
    return knownError(error) ?? unexpectedError("vendor.team.invite", error);
  }
}
