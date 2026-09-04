"use client";

import { Badge } from "@albora/ui-web";
import { useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";

type Pagamento = {
  id: string;
  status: string;
  amountCents: number;
  billingType: string | null;
  description: string | null;
  createdAt: string;
  dueDate: string | null;
  invoiceUrl: string | null;
};

const ROTULO_STATUS: Record<string, string> = {
  PENDING: "Pendente",
  CONFIRMED: "Confirmada",
  RECEIVED: "Recebida",
  RECEIVED_IN_CASH: "Recebida",
  OVERDUE: "Vencida",
  REFUNDED: "Estornada",
  REFUND_REQUESTED: "Estorno solicitado",
  REFUND_IN_PROGRESS: "Estorno em curso",
  DELETED: "Removida",
  AWAITING_RISK_ANALYSIS: "Em análise",
};

const ROTULO_FORMA: Record<string, string> = {
  PIX: "Pix",
  CREDIT_CARD: "Cartão de crédito",
  BOLETO: "Boleto",
  UNDEFINED: "—",
};

function statusTone(status: string): "accent" | "critico" | "neutral" {
  if (status === "CONFIRMED" || status === "RECEIVED" || status === "RECEIVED_IN_CASH") {
    return "accent";
  }
  if (
    status === "OVERDUE" ||
    status === "REFUNDED" ||
    status === "DELETED" ||
    status.startsWith("CHARGEBACK")
  ) {
    return "critico";
  }
  return "neutral";
}

function formatarValor(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Histórico de cobranças da conta — lê o Asaas ao vivo via `/api/admin/billing`; sem checkout ainda feito, a lista vem vazia (caso comum, não é erro). */
export function BillingHistory() {
  const [pagamentos, setPagamentos] = useState<Pagamento[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;
    fetch("/api/admin/billing")
      .then((r) => {
        if (!r.ok) throw new Error("falhou");
        return r.json() as Promise<{ pagamentos: Pagamento[] }>;
      })
      .then((data) => {
        if (!cancelado) setPagamentos(data.pagamentos);
      })
      .catch(() => {
        if (!cancelado) setErro(true);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (erro) {
    return (
      <AdminSection>
        <p role="alert" className="tipo-body m-0 text-critico">
          Não foi possível carregar o histórico agora. Recarregue a página ou tente em instantes.
        </p>
      </AdminSection>
    );
  }

  if (pagamentos === null) {
    return (
      <AdminSection>
        <div className="animate-pulse">
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-token bg-superficie-alta" />
            ))}
          </div>
        </div>
      </AdminSection>
    );
  }

  if (pagamentos.length === 0) {
    return (
      <AdminSection>
        <div className="py-8 text-center">
          <p className="tipo-body mb-2 mt-0 text-ink">Nenhuma cobrança ainda</p>
          <p className="tipo-caption m-0 text-ink-3">
            Assim que o evento fizer o primeiro checkout, ele aparece aqui.
          </p>
        </div>
      </AdminSection>
    );
  }

  return (
    <AdminSection>
      <div className="flex flex-col gap-2">
        {pagamentos.map((p) => (
          <div
            key={p.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-token bg-bg px-3.5 py-3"
          >
            <div className="min-w-0">
              <p className="tipo-body m-0 text-ink">{formatarData(p.createdAt)}</p>
              <p className="tipo-caption m-0 mt-0.5 text-ink-3">
                {p.billingType ? (ROTULO_FORMA[p.billingType] ?? p.billingType) : "—"}
                {p.description ? ` · ${p.description}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <span className="tipo-body font-medium tabular-nums text-ink">
                {formatarValor(p.amountCents)}
              </span>
              <Badge tone={statusTone(p.status)}>{ROTULO_STATUS[p.status] ?? p.status}</Badge>
              {p.invoiceUrl && (
                <a
                  href={p.invoiceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="tipo-caption inline-flex min-h-11 items-center text-ink-3 underline-offset-2 hover:text-ink hover:underline"
                >
                  Ver fatura
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </AdminSection>
  );
}
