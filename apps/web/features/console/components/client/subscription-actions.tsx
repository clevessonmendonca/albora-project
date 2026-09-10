"use client";

import React, { useState, useTransition } from "react";
import { Button, ConfirmDialog, Select, TextField } from "@albora/ui-web";
import {
  applySubscriptionCourtesyAction,
  cancelSubscriptionAction,
  changeSubscriptionPlanAction,
  refundPaymentAction,
} from "@/features/console/actions";

type Plano = "starter" | "studio" | "agency";

const ROTULO_PLANO: Record<Plano, string> = { starter: "Starter", studio: "Studio", agency: "Agency" };

type StatusPagamento = "confirmed" | "received";

const ROTULO_STATUS_PAGAMENTO: Record<StatusPagamento, string> = { confirmed: "Confirmado", received: "Recebido" };

/**
 * Prop vinda de `listRefundablePayments` (`@albora/application`) via
 * `subscriptions/page.tsx` — sempre já filtrada a `confirmed`/`received`
 * do fornecedor da linha (nunca `refunded`/`deleted`). `paidAt` cruza a
 * borda servidor→cliente como `Date` (RSC serializa nativamente, mesmo
 * padrão de `events-table.tsx`/`audit-table.tsx`).
 */
export type PagamentoReembolsavel = {
  id: string;
  asaasPaymentId: string;
  amountCents: number;
  status: StatusPagamento;
  paidAt: Date | null;
};

function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
}

function formatarData(data: Date | null): string {
  return data ? new Date(data).toLocaleDateString("pt-BR") : "sem data";
}

function rotuloDoPagamento(p: PagamentoReembolsavel): string {
  return `${formatarReais(p.amountCents)} — ${formatarData(p.paidAt)} — ${ROTULO_STATUS_PAGAMENTO[p.status]}`;
}

/**
 * "800,00" ou "800.00" → 80000. Vírgula ou ponto — o operador digita como
 * está acostumado. `Math.round` depois de multiplicar por 100, nunca
 * `* 100` sozinho: `Number("19,90".replace(",", "."))` é `19.9`, e
 * `19.9 * 100` em IEEE-754 dá `1989.9999999999998`, não `1990` — o comando
 * recebe centavos, e centavos são inteiros. Devolve `null` pra entrada não
 * numérica ou não positiva, nunca um número inventado.
 */
function parseReaisParaCentavos(valor: string): number | null {
  const numero = Number(valor.trim().replace(",", "."));
  if (!Number.isFinite(numero) || numero <= 0) return null;
  return Math.round(numero * 100);
}

/**
 * `ApprovalRequiredError` (`refund-payment.ts` + `refundPolicy` em
 * `packages/core/src/authorization/policies.ts`, commit 26a29ed) chega aqui
 * como a mensagem default da classe — "subscription.refund exige aprovação
 * de subscription.refund.approve" — porque `traduzErroDeComando` (actions.ts)
 * não inventa texto, só evita re-lançar. Traduzir esse texto técnico pra
 * "exige o dono" é o que a espinha pede; não existe fila nenhuma aqui —
 * quem tem a capability (só `owner`) reembolsa direto, no mesmo diálogo.
 */
function traduzErroDeReembolso(erro: string): string {
  if (erro.includes("subscription.refund.approve")) return "Esse valor exige aprovação do dono.";
  return erro;
}

/**
 * Cortesia e cancelamento vêm da Onda C. Trocar plano e reembolsar fecham a
 * dívida que a T6 daquela onda registrou: os comandos (`changeSubscriptionPlan`,
 * `refundPayment`) e as server actions já existiam, testados — só faltava a
 * tela. Nenhum dos quatro diálogos usa `DangerDialog` — nenhuma das quatro
 * ações é irreversível como exclusão de conta.
 */
export function SubscriptionActions({
  subscriptionId,
  plan,
  podeMutar,
  podeReembolsar,
  priceTable,
  refundablePayments,
}: {
  subscriptionId: string;
  vendorId: string;
  plan: Plano;
  podeMutar: boolean;
  podeReembolsar: boolean;
  priceTable: Record<Plano, number>;
  /** `[]` por padrão — nenhum fornecedor sem pagamento reembolsável é tratado como bug de prop faltando. */
  refundablePayments?: PagamentoReembolsavel[];
}) {
  const pagamentos = refundablePayments ?? [];
  const [dialogo, setDialogo] = useState<"cortesia" | "cancelar" | "trocar_plano" | "reembolsar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [novoPlano, setNovoPlano] = useState<Plano>(plan);
  const [pagamentoSelecionadoId, setPagamentoSelecionadoId] = useState("");
  const [valorReembolso, setValorReembolso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!podeMutar && !podeReembolsar) return <span className="tipo-den-corpo text-ink-3">—</span>;

  function fechar() {
    setDialogo(null);
    setErro(null);
    setMotivo("");
    setNovoPlano(plan);
    setPagamentoSelecionadoId("");
    setValorReembolso("");
  }

  const pagamentoSelecionado = pagamentos.find((p) => p.id === pagamentoSelecionadoId) ?? null;

  function selecionarPagamento(id: string) {
    setPagamentoSelecionadoId(id);
    const pagamento = pagamentos.find((p) => p.id === id);
    // Valor default é o valor cheio do pagamento — o operador reduz pra
    // reembolso parcial, nunca digita do zero (`parseReaisParaCentavos`
    // aceita vírgula ou ponto igual à digitação manual).
    setValorReembolso(pagamento ? (pagamento.amountCents / 100).toFixed(2).replace(".", ",") : "");
  }

  const motivoVazio = motivo.trim().length === 0;
  const valorReembolsoCentavos = parseReaisParaCentavos(valorReembolso);
  const valorExcedeOPagamento =
    pagamentoSelecionado !== null && valorReembolsoCentavos !== null && valorReembolsoCentavos > pagamentoSelecionado.amountCents;
  const reembolsoInvalido =
    motivoVazio || pagamentoSelecionado === null || valorReembolsoCentavos === null || valorExcedeOPagamento;

  return (
    <div className="flex flex-wrap gap-2">
      {podeMutar && (
        <>
          <Button type="button" variant="tertiary" size="sm" onClick={() => setDialogo("trocar_plano")}>
            Trocar plano
          </Button>
          <Button type="button" variant="tertiary" size="sm" onClick={() => setDialogo("cortesia")}>
            Cortesia
          </Button>
          <Button type="button" variant="tertiary" size="sm" onClick={() => setDialogo("cancelar")}>
            Cancelar
          </Button>
        </>
      )}
      {podeReembolsar && (
        <Button type="button" variant="tertiary" size="sm" onClick={() => setDialogo("reembolsar")}>
          Reembolsar
        </Button>
      )}

      <ConfirmDialog
        open={dialogo === "trocar_plano"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await changeSubscriptionPlanAction(subscriptionId, novoPlano, priceTable[novoPlano], motivo);
            if (resultado.ok) fechar();
            else setErro(resultado.error);
          })
        }
        title={`Trocar plano — ${ROTULO_PLANO[plan]} → ${ROTULO_PLANO[novoPlano]}?`}
        description={
          <div className="flex flex-col gap-3">
            <Select label="Novo plano" value={novoPlano} onChange={(e) => setNovoPlano(e.target.value as Plano)}>
              {(["starter", "studio", "agency"] as const).map((p) => (
                <option key={p} value={p}>
                  {ROTULO_PLANO[p]} — {formatarReais(priceTable[p])}/mês
                </option>
              ))}
            </Select>
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmDisabled={motivoVazio}
        confirmLabel="Confirmar troca de plano"
      />

      <ConfirmDialog
        open={dialogo === "cortesia"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await applySubscriptionCourtesyAction(subscriptionId, 100, motivo);
            if (resultado.ok) fechar();
            else setErro(resultado.error);
          })
        }
        title={`Aplicar cortesia (100%) — plano ${plan}?`}
        description={
          <div className="flex flex-col gap-3">
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
      />

      <ConfirmDialog
        open={dialogo === "cancelar"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await cancelSubscriptionAction(subscriptionId, motivo);
            if (resultado.ok) fechar();
            else setErro(resultado.error);
          })
        }
        title="Cancelar assinatura?"
        description={
          <div className="flex flex-col gap-3">
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmLabel="Cancelar assinatura"
      />

      <ConfirmDialog
        open={dialogo === "reembolsar"}
        onClose={fechar}
        onConfirm={() =>
          startTransition(async () => {
            // `reembolsoInvalido` já bloqueia o botão pros três casos abaixo —
            // esta dupla checagem só cobre o clique escapando do gate do
            // dialog, e mesmo assim não inventa pagamento nem valor nenhum
            // pro comando.
            if (pagamentoSelecionado === null || valorReembolsoCentavos === null) {
              setErro("Selecione um pagamento e um valor válido antes de confirmar.");
              return;
            }
            const resultado = await refundPaymentAction(
              pagamentoSelecionado.id,
              pagamentoSelecionado.asaasPaymentId,
              valorReembolsoCentavos,
              motivo,
            );
            if (resultado.ok) fechar();
            else setErro(traduzErroDeReembolso(resultado.error));
          })
        }
        title="Reembolsar pagamento?"
        description={
          <div className="flex flex-col gap-3">
            {pagamentos.length === 0 ? (
              <p className="tipo-den-corpo m-0 text-ink-3">Nenhum pagamento reembolsável para este fornecedor.</p>
            ) : (
              <>
                <Select
                  label="Pagamento"
                  value={pagamentoSelecionadoId}
                  onChange={(e) => selecionarPagamento(e.target.value)}
                >
                  <option value="">Selecione um pagamento</option>
                  {pagamentos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {rotuloDoPagamento(p)}
                    </option>
                  ))}
                </Select>
                <TextField
                  label="Valor (R$)"
                  value={valorReembolso}
                  onChange={(e) => setValorReembolso(e.target.value)}
                  placeholder="150,00"
                  disabled={pagamentoSelecionado === null}
                  {...(pagamentoSelecionado
                    ? { hint: `Máximo: ${formatarReais(pagamentoSelecionado.amountCents)} (valor do pagamento)` }
                    : {})}
                  {...(valorExcedeOPagamento
                    ? { error: "Não é possível reembolsar mais do que o valor do pagamento." }
                    : {})}
                />
              </>
            )}
            <TextField label="Motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            {erro && (
              <p role="alert" className="tipo-caption m-0 text-critico">
                {erro}
              </p>
            )}
          </div>
        }
        pending={pending}
        confirmDisabled={reembolsoInvalido}
        confirmLabel="Confirmar reembolso"
      />
    </div>
  );
}
