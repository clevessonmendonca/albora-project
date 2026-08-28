import {
  asaasCustomerIdForAccount,
  createVendorSubscription,
  ehAssinaturaDuplicada,
  roleForAccountOnVendor,
  upsertBillingCustomer,
  type VendorPlan,
} from "@albora/db";
import {
  ADMIN_SESSION_REQUIRED,
  errorResponse,
  jsonOk,
  parseJsonBody,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";
import { resolveBilling, VENDOR_PLAN_PRICE_CENTS } from "@/lib/billing";
import { consume } from "@/lib/rate-limit-store";
import type { Pool } from "pg";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VENDOR_PLANS: readonly VendorPlan[] = ["starter", "studio", "agency"];

type Body = { plan?: unknown; billingType?: unknown };

function isVendorPlan(v: unknown): v is VendorPlan {
  return typeof v === "string" && (VENDOR_PLANS as readonly string[]).includes(v);
}

/** `vendor_subscriptions` sem RLS — `WHERE vendor_id = $1` é a única contenção (vendorId já passou por `roleForAccountOnVendor`); evita assinatura dupla por duas abas ou chamada direta. */
async function hasPendingOrActiveVendorSubscription(pool: Pool, vendorId: string): Promise<boolean> {
  const { rows } = await pool.query<{ blocked: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM vendor_subscriptions
        WHERE vendor_id = $1 AND status IN ('pending', 'active')
     ) AS blocked`,
    [vendorId],
  );
  return rows[0]?.blocked ?? false;
}

/** Só registra assinatura como `pending` — `ativarPlanoDoFornecedor` roda no webhook, nunca aqui; verificação de duplicata antes de qualquer chamada ao Asaas (UI não é suficiente). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ vendorId: string }> },
) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  const { vendorId } = await params;
  if (!UUID.test(vendorId)) {
    return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
  }

  const role = await roleForAccountOnVendor(getPool(), auth.host.accountId, vendorId);
  if (!role) {
    return errorResponse(404, "vendor.nao_encontrado", "Fornecedor não encontrado");
  }
  if (role !== "admin") {
    return errorResponse(403, "vendor.papel_negado", "Só admin do fornecedor pode assinar");
  }

  if (await hasPendingOrActiveVendorSubscription(getPool(), vendorId)) {
    return errorResponse(
      409,
      "vendor.assinatura_ja_existe",
      "Já há uma assinatura ativa ou aguardando confirmação",
    );
  }

  const limit = consume(`vendor_subscription:${auth.host.accountId}`, 5, 60, Date.now());
  if (!limit.allowed) {
    return errorResponse(429, "limite.excedido", "Espere um instante", {
      retry_after_seconds: limit.resetInSeconds,
    });
  }

  const parsed = await parseJsonBody<Body>(req);
  if (parsed instanceof Response) return parsed;

  const plan = parsed.data.plan;
  if (!isVendorPlan(plan)) {
    return errorResponse(422, "validation_error", "Plano inválido", { campos: ["plan"] });
  }
  const billingType =
    parsed.data.billingType === "PIX" || parsed.data.billingType === "CREDIT_CARD"
      ? parsed.data.billingType
      : "UNDEFINED";

  const billing = resolveBilling();
  if (billing.mode === "unavailable") {
    return errorResponse(503, "billing.indisponivel", "Cobrança indisponível");
  }

  const amountCents = VENDOR_PLAN_PRICE_CENTS[plan];

  try {
    const provider = billing.provider;
    let customerId = await asaasCustomerIdForAccount(getPool(), auth.host.accountId);
    if (!customerId) {
      customerId = await provider.ensureCustomer(
        auth.host.email,
        auth.host.accountId,
        auth.host.email.split("@")[0],
      );
      await upsertBillingCustomer(getPool(), auth.host.accountId, customerId);
    }

    const subscription = await provider.createSubscription({
      vendorId,
      accountId: auth.host.accountId,
      email: auth.host.email,
      plan,
      amountCents,
      billingType,
      customerId,
    });

    const saved = await createVendorSubscription(getPool(), {
      vendorId,
      accountId: auth.host.accountId,
      asaasSubscriptionId: subscription.providerSubscriptionId,
      plan,
    });

    console.log("vendor_billing.assinatura_criada", { plan, mode: billing.mode });

    return jsonOk({
      subscriptionId: saved.id,
      asaasSubscriptionId: saved.asaasSubscriptionId,
      invoiceUrl: subscription.invoiceUrl,
      amountCents,
      plan,
      stub: billing.mode === "stub",
    });
  } catch (e) {
    // Rede de segurança do índice único parcial (migration 0043): a checagem
    // acima (hasPendingOrActiveVendorSubscription) reduz a corrida, mas não a
    // fecha — duas chamadas concorrentes podem passar pelo mesmo SELECT antes
    // de qualquer INSERT confirmar. O banco recusa a segunda; aqui isso vira
    // o mesmo 409 amigável, não um 500.
    if (ehAssinaturaDuplicada(e)) {
      return errorResponse(
        409,
        "vendor.assinatura_ja_existe",
        "Já há uma assinatura ativa ou aguardando confirmação",
      );
    }
    return unexpectedError("vendor_billing.subscription", e);
  }
}
