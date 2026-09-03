import { asaasCustomerIdForAccount } from "@albora/db";
import type { PaymentSummary } from "@/lib/billing";
import { resolveBilling } from "@/lib/billing";
import {
  ADMIN_SESSION_REQUIRED,
  jsonOk,
  requireConfig,
  requireHostSession,
  unexpectedError,
} from "@/lib/api";
import { getPool } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Histórico de cobranças da conta (admin/billing) — fora do caminho crítico de upload; sem cliente Asaas configurado ou sem `billing_customers`, devolve lista vazia em vez de 500 (nunca cobrou ainda é o caso comum). */
export async function getAdminBilling(req: Request) {
  const cfgErr = requireConfig("admin", { log: false });
  if (cfgErr) return cfgErr;

  const auth = await requireHostSession(req, ADMIN_SESSION_REQUIRED);
  if (auth instanceof Response) return auth;

  try {
    const customerId = await asaasCustomerIdForAccount(getPool(), auth.host.accountId);
    if (!customerId) {
      return jsonOk({ pagamentos: [] satisfies PaymentSummary[] });
    }

    const billing = resolveBilling();
    if (billing.mode === "unavailable") {
      return jsonOk({ pagamentos: [] satisfies PaymentSummary[] });
    }

    const pagamentos = await billing.provider.listPayments(customerId);
    return jsonOk({ pagamentos });
  } catch (e) {
    return unexpectedError("admin.billing", e);
  }
}
