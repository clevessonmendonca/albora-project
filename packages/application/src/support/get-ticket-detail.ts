import type { Pool } from "pg";
import type { Actor } from "@albora/core";
import {
  getAccountDetailAdmin, getSupportTicketAdmin, listBillingPaymentsForAccountAdmin, listSupportMessagesAdmin,
  maskEmail, type BillingPaymentSummaryAdmin, type SupportMessageRow, type SupportTicketAdmin,
} from "@albora/db";
import { withPlatformAggregation } from "../platform/aggregation";

export type TicketCustomerContext = {
  maskedEmail: string;
  plan: string | null;
  events: { id: string; title: string | null; startsAt: Date; status: string }[];
  recentPayments: BillingPaymentSummaryAdmin[];
};

export type TicketDetailResult = {
  ticket: SupportTicketAdmin;
  messages: SupportMessageRow[];
  customerContext: TicketCustomerContext;
} | null;

export type GetTicketDetailInput = { actor: Actor; reason: string; ticketId: string };

/**
 * Painel de contexto do cliente (spec §8.1.6): plano, eventos, pagamentos
 * recentes — sem "erros recentes" (não existe tabela de erro por
 * conta/evento neste codebase; ver Lacunas). PII sempre mascarada aqui —
 * revelar é T3, ação separada e auditada à parte.
 */
export async function getTicketDetail(
  deps: { pool: Pool; aggregatorPool: Pool },
  input: GetTicketDetailInput,
): Promise<TicketDetailResult> {
  return withPlatformAggregation(deps, {
    actor: input.actor,
    capability: "tickets.read",
    reason: input.reason,
    action: "tickets.detail.read",
    run: async () => {
      const ticket = await getSupportTicketAdmin(deps.aggregatorPool, input.ticketId);
      if (!ticket) return null;

      const [messages, conta, pagamentos] = await Promise.all([
        listSupportMessagesAdmin(deps.aggregatorPool, input.ticketId),
        getAccountDetailAdmin(deps.aggregatorPool, ticket.accountId),
        listBillingPaymentsForAccountAdmin(deps.aggregatorPool, ticket.accountId),
      ]);

      return {
        ticket,
        messages,
        customerContext: {
          maskedEmail: conta?.maskedEmail ?? maskEmail("desconhecido@desconhecido"),
          plan: conta?.plan ?? null,
          events: conta?.events ?? [],
          recentPayments: pagamentos,
        },
      };
    },
  });
}
