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

/**
 * `motivo`/`em` são opacos por desenho (`vendorId` é UUID, nunca nome de
 * casal nem e-mail) — mesmo espírito de `auditarAgregacaoDoPortal`
 * (`features/vendor-portal/lib/audit.ts`), duplicado aqui em vez de
 * importado porque o webhook está fora do escopo de arquivo do portal.
 */
function auditarWebhookDeAssinatura(registro: { motivo: string; em: Date }): void {
  console.log("vendor_billing.webhook_agregacao", {
    motivo: registro.motivo,
    em: registro.em.toISOString(),
  });
}

/**
 * Webhook Asaas — assinatura do fornecedor (Modelo A, spec §4.4). Única
 * escrita de `vendors.status`/`plan` pago (via `ativarPlanoDoFornecedor`,
 * `comAgregacao`/BYPASSRLS auditado).
 *
 * Autenticidade validada ANTES de qualquer leitura de corpo —
 * `parseVendorWebhook` confere o token `asaas-access-token` antes de tocar
 * `payment.subscription`; token divergente devolve 401 sem processar nada.
 * Um POST forjado nunca chega a `markVendorSubscriptionByAsaasId`.
 *
 * Idempotente em duas camadas: `claimWebhookEvent` por `asaas_event_id`
 * (replay do mesmo evento é `{ duplicate: true }`, sem segunda escrita) e
 * `markVendorSubscriptionByAsaasId` por `asaas_subscription_id` (evento de
 * assinatura desconhecida devolve `null`, sem quebrar a resposta 200).
 */
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
