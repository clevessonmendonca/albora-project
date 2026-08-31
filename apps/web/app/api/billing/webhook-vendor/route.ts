import {
  ativarPlanoDoFornecedor,
  claimWebhookEvent,
  markVendorSubscriptionByAsaasId,
} from "@albora/db";
import { errorResponse, jsonOk, unexpectedError } from "@/lib/api";
import { getAggregatorPool, getPool } from "@/lib/db";
import {
  isBillingStubMode,
  parseVendorWebhook,
  readAsaasWebhookToken,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

/** `motivo`/`em` opacos (UUID, nunca PII) — duplicado de `auditarAgregacaoDoPortal` porque webhook está fora do escopo do portal. */
function auditarWebhookDeAssinatura(registro: { motivo: string; em: Date }): void {
  console.log("vendor_billing.webhook_agregacao", {
    motivo: registro.motivo,
    em: registro.em.toISOString(),
  });
}

/** Webhook Asaas: token validado ANTES do corpo (401 sem processar POST forjado); idempotente via `claimWebhookEvent` (asaas_event_id) e `markVendorSubscriptionByAsaasId` (asaas_subscription_id). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "billing.webhook_invalido", "JSON inválido");
  }

  const token = readAsaasWebhookToken();
  if (!token && !isBillingStubMode()) {
    return errorResponse(503, "billing.webhook_config", "Webhook não configurado");
  }

  const parsed = parseVendorWebhook(req.headers, body, token);
  if (parsed && "error" in parsed) {
    return errorResponse(401, "billing.webhook_token", "Token inválido");
  }
  if (!parsed) {
    return jsonOk({ ignored: true });
  }

  try {
    const claimed = await claimWebhookEvent(
      getPool(),
      parsed.eventId,
      parsed.eventName,
      parsed.subscriptionId,
    );
    if (!claimed) {
      return jsonOk({ duplicate: true });
    }

    if (parsed.status === "CONFIRMED" || parsed.status === "RECEIVED") {
      const marked = await markVendorSubscriptionByAsaasId(
        getPool(),
        parsed.subscriptionId,
        "active",
      );
      if (marked) {
        await ativarPlanoDoFornecedor(
          getAggregatorPool(),
          marked.vendorId,
          marked.plan,
          auditarWebhookDeAssinatura,
        );
        console.log("vendor_billing.plano_ativado", { plan: marked.plan });
      }
    } else if (parsed.status === "OVERDUE") {
      await markVendorSubscriptionByAsaasId(getPool(), parsed.subscriptionId, "overdue");
    } else if (parsed.status === "DELETED" || parsed.status === "REFUNDED") {
      await markVendorSubscriptionByAsaasId(getPool(), parsed.subscriptionId, "canceled");
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return unexpectedError("vendor_billing.webhook", e);
  }
}
