import { VendorTeamAccessError } from "@albora/db";
import {
  cancelVendorSubscription,
  changeVendorSubscriptionPlan,
  vendorBillingDependencies,
  VendorBillingUnavailableError,
  VendorSubscriptionStateError,
} from "@/lib/application/use-cases/vendor-billing";
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
type RouteParams = { params: Promise<{ vendorId: string; subscriptionId: string }> };
type PatchBody = { plan?: unknown };

function knownError(error: unknown): Response | null {
  if (error instanceof VendorTeamAccessError) return errorResponse(404, error.code, "Assinatura não encontrada");
  if (error instanceof VendorBillingUnavailableError) return errorResponse(503, error.code, error.message);
  if (error instanceof VendorSubscriptionStateError) return errorResponse(409, error.code, error.message);
  return null;
}

async function context(req: Request, route: RouteParams) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;
  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;
  const { vendorId, subscriptionId } = await route.params;
  if (!UUID_RE.test(vendorId) || !UUID_RE.test(subscriptionId)) {
    return errorResponse(404, "vendor.subscription.not_found", "Assinatura não encontrada");
  }
  const rate = consume(`vendor_subscription_manage:${auth.host.accountId}`, 10, 60, Date.now());
  if (!rate.allowed) return errorResponse(429, "limite.excedido", "Espere um instante e tente novamente");
  return { auth, vendorId, subscriptionId };
}

export async function PATCH(req: Request, route: RouteParams) {
  const ctx = await context(req, route);
  if (ctx instanceof Response) return ctx;
  const parsed = await parseJsonBody<PatchBody>(req);
  if (parsed instanceof Response) return parsed;
  const plan = parsed.data.plan;
  if (plan !== "starter" && plan !== "studio" && plan !== "agency") {
    return errorResponse(422, "validation_error", "Escolha um plano válido", { campos: ["plan"] });
  }
  try {
    const subscription = await changeVendorSubscriptionPlan(vendorBillingDependencies(), ctx.auth.host, {
      vendorId: ctx.vendorId,
      subscriptionId: ctx.subscriptionId,
      plan,
    });
    return jsonOk({ subscription });
  } catch (error) {
    return knownError(error) ?? unexpectedError("vendor.subscription.change_plan", error);
  }
}

export async function DELETE(req: Request, route: RouteParams) {
  const ctx = await context(req, route);
  if (ctx instanceof Response) return ctx;
  try {
    const subscription = await cancelVendorSubscription(vendorBillingDependencies(), ctx.auth.host, {
      vendorId: ctx.vendorId,
      subscriptionId: ctx.subscriptionId,
    });
    return jsonOk({ subscription });
  } catch (error) {
    return knownError(error) ?? unexpectedError("vendor.subscription.cancel", error);
  }
}
