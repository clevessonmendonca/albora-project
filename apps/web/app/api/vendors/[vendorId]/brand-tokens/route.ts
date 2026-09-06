import {
  atualizarBrandTokensDoFornecedor,
  ErroBrandTokensInvalidos,
  roleForAccountOnVendor,
  type BrandTokensDoFornecedor,
} from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

const HEX = /^#[0-9a-fA-F]{6}$/;
const URL_LOGO = /^https:\/\/\S{1,2000}$/;
const COR_CHAVES = ["acento", "papel", "noite", "tinta"] as const;

type RawBody = {
  cores?: unknown;
  background?: unknown;
  logoUrl?: unknown;
};

function validarBody(raw: RawBody): BrandTokensDoFornecedor | string[] {
  const erros: string[] = [];
  const cores: BrandTokensDoFornecedor["cores"] = {};

  if (raw.cores !== null && raw.cores !== undefined) {
    if (typeof raw.cores !== "object" || Array.isArray(raw.cores)) {
      erros.push("cores");
    } else {
      const rawCores = raw.cores as Record<string, unknown>;
      for (const chave of COR_CHAVES) {
        const v = rawCores[chave];
        if (v === undefined || v === null) continue;
        if (typeof v !== "string" || !HEX.test(v)) {
          erros.push(`cores.${chave}`);
        } else {
          cores[chave] = v;
        }
      }
    }
  }

  const bg = raw.background;
  if (bg !== undefined && bg !== null && bg !== "light" && bg !== "dark") {
    erros.push("background");
  }

  const logoUrl = raw.logoUrl;
  if (logoUrl !== undefined && logoUrl !== null) {
    if (typeof logoUrl !== "string" || !URL_LOGO.test(logoUrl)) {
      erros.push("logoUrl");
    }
  }

  if (erros.length > 0) return erros;

  const payload: BrandTokensDoFornecedor = {};
  if (Object.keys(cores).length > 0) payload.cores = cores;
  if (bg === "light" || bg === "dark") payload.background = bg;
  if (typeof logoUrl === "string") payload.logoUrl = logoUrl;
  return payload;
}

/** Só `admin` do fornecedor pode alterar — hex validado por `validarBody` antes de chegar ao banco; `roleForAccountOnVendor` é o portão de papel. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { vendorId } = await params;
  if (!UUID_RE.test(vendorId)) {
    return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
  }

  const role = await roleForAccountOnVendor(getPool(), auth.host.accountId, vendorId);
  if (!role) {
    return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
  }
  if (role !== "admin") {
    return errorResponse(403, "vendor.papel_negado", "Só o admin do fornecedor pode editar a marca");
  }

  const limit = consume(`vendor_brand_tokens:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<RawBody>(req);
  if (parsed instanceof Response) return parsed;

  const resultado = validarBody(parsed.data);
  if (Array.isArray(resultado)) {
    return errorResponse(422, "validation_error", "Campos inválidos", { campos: resultado });
  }

  if (!resultado.cores && resultado.background === undefined && resultado.logoUrl === undefined) {
    return errorResponse(422, "validation_error", "Nenhum campo para atualizar", {
      campos: ["cores", "background", "logoUrl"],
    });
  }

  try {
    const atualizado = await atualizarBrandTokensDoFornecedor(
      getPool(),
      auth.host.accountId,
      vendorId,
      resultado,
    );
    if (!atualizado) {
      return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
    }
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof ErroBrandTokensInvalidos) {
      return errorResponse(422, "validation_error", "Campos inválidos", { campos: e.campos });
    }
    return unexpectedError("vendor_brand_tokens.patch", e);
  }
}
