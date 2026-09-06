import {
  atualizarFornecedor,
  criarFornecedor,
  ErroDadosDeFornecedorInvalidos,
  ErroSlugDeFornecedorEmUso,
  fornecedorParaConta,
} from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
  UUID_RE,
} from "@/lib/api";
import { auditarAgregacaoDoPortal } from "@/features/vendor-portal/lib/audit";
import { getAggregatorPool, getPool } from "@/lib/db";
import { consume } from "@/lib/rate-limit-store";

export const dynamic = "force-dynamic";

type CriarBody = { name?: unknown; slug?: unknown };
type AtualizarBody = { name?: unknown; slug?: unknown };

function nomeDoBody(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

function slugDoBody(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim().toLowerCase() : null;
}

function respostaDadosInvalidos(campos: string[]): Response {
  return errorResponse(422, "validation_error", "Campos inválidos", { campos });
}

function respostaSlugEmUso(): Response {
  return errorResponse(409, "vendor.slug_em_uso", "Esse identificador já está em uso", {
    campos: ["slug"],
  });
}

/** Cria fornecedor (Onda 3, task 15): a conta da sessão de host vira `admin` do fornecedor — convite de equipe fica para a Onda 4. */
export async function POST(req: Request) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const limit = consume(`admin_vendor_criar:${auth.host.accountId}`, 10, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<CriarBody>(req);
  if (parsed instanceof Response) return parsed;

  const name = nomeDoBody(parsed.data.name);
  const slug = slugDoBody(parsed.data.slug);
  if (!name || !slug) {
    const camposAusentes: string[] = [];
    if (!name) camposAusentes.push("name");
    if (!slug) camposAusentes.push("slug");
    return errorResponse(422, "validation_error", "Nome e identificador são obrigatórios", {
      campos: camposAusentes,
    });
  }

  try {
    const criado = await criarFornecedor(
      getAggregatorPool(),
      auth.host.accountId,
      { name, slug },
      auditarAgregacaoDoPortal,
    );
    console.log("admin.vendor_criado", {
      accountId: auth.host.accountId,
      vendorId: criado.vendorId,
    });
    return jsonOk({ vendorId: criado.vendorId, slug: criado.slug }, { status: 201 });
  } catch (e) {
    if (e instanceof ErroDadosDeFornecedorInvalidos) return respostaDadosInvalidos(e.campos);
    if (e instanceof ErroSlugDeFornecedorEmUso) return respostaSlugEmUso();
    return unexpectedError("admin.vendor_criar", e);
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { vendorId } = await params;
  if (!UUID_RE.test(vendorId)) {
    return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
  }

  try {
    const vendor = await fornecedorParaConta(getPool(), auth.host.accountId, vendorId);
    if (!vendor) {
      return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
    }
    return jsonOk({ vendor });
  } catch (e) {
    return unexpectedError("admin.vendor_ler", e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { vendorId } = await params;
  if (!UUID_RE.test(vendorId)) {
    return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
  }

  const limit = consume(`admin_vendor_atualizar:${auth.host.accountId}`, 20, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<AtualizarBody>(req);
  if (parsed instanceof Response) return parsed;

  let name: string | undefined;
  if (parsed.data.name !== undefined) {
    const parsedName = nomeDoBody(parsed.data.name);
    if (!parsedName) return respostaDadosInvalidos(["name"]);
    name = parsedName;
  }

  let slug: string | undefined;
  if (parsed.data.slug !== undefined) {
    const parsedSlug = slugDoBody(parsed.data.slug);
    if (!parsedSlug) return respostaDadosInvalidos(["slug"]);
    slug = parsedSlug;
  }

  if (name === undefined && slug === undefined) {
    return errorResponse(422, "validation_error", "Nenhum campo para atualizar", {
      campos: ["name", "slug"],
    });
  }

  try {
    const atualizado = await atualizarFornecedor(getPool(), auth.host.accountId, vendorId, {
      ...(name !== undefined ? { name } : {}),
      ...(slug !== undefined ? { slug } : {}),
    });
    if (!atualizado) {
      return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
    }
    console.log("admin.vendor_atualizado", { accountId: auth.host.accountId, vendorId });
    return jsonOk({ ok: true });
  } catch (e) {
    if (e instanceof ErroDadosDeFornecedorInvalidos) return respostaDadosInvalidos(e.campos);
    if (e instanceof ErroSlugDeFornecedorEmUso) return respostaSlugEmUso();
    return unexpectedError("admin.vendor_atualizar", e);
  }
}
