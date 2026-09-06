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

function formatarReais(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(centavos / 100);
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
}: {
  subscriptionId: string;
  vendorId: string;
  plan: Plano;
  podeMutar: boolean;
  podeReembolsar: boolean;
  priceTable: Record<Plano, number>;
}) {
  const [dialogo, setDialogo] = useState<"cortesia" | "cancelar" | "trocar_plano" | "reembolsar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [novoPlano, setNovoPlano] = useState<Plano>(plan);
  const [paymentId, setPaymentId] = useState("");
  const [asaasPaymentId, setAsaasPaymentId] = useState("");
  const [valorReembolso, setValorReembolso] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!podeMutar && !podeReembolsar) return <span className="tipo-den-corpo text-ink-3">—</span>;

  function fechar() {
    setDialogo(null);
    setErro(null);
    setMotivo("");
    setNovoPlano(plan);
    setPaymentId("");
    setAsaasPaymentId("");
    setValorReembolso("");
  }

  const motivoVazio = motivo.trim().length === 0;
  const valorReembolsoCentavos = parseReaisParaCentavos(valorReembolso);
  const reembolsoInvalido =
    motivoVazio || paymentId.trim().length === 0 || asaasPaymentId.trim().length === 0 || valorReembolsoCentavos === null;

  return (
    <div className="flex flex-wrap gap-2">
      {podeMutar && (
        <>
          <Button type="button" variant="tertiary" onClick={() => setDialogo("trocar_plano")}>
            Trocar plano
          </Button>
          <Button type="button" variant="tertiary" onClick={() => setDialogo("cortesia")}>
            Cortesia
          </Button>
          <Button type="button" variant="tertiary" onClick={() => setDialogo("cancelar")}>
            Cancelar
          </Button>
        </>
      )}
      {podeReembolsar && (
        <Button type="button" variant="tertiary" onClick={() => setDialogo("reembolsar")}>
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
            // `reembolsoInvalido` já bloqueia o botão — `valorReembolsoCentavos`
            // só pode ser `null` aqui se o clique escapar do gate do dialog,
            // e mesmo assim não inventa valor nenhum pro comando.
            if (valorReembolsoCentavos === null) {
              setErro("Valor inválido — use um número maior que zero, ex.: 150,00");
              return;
            }
            const resultado = await refundPaymentAction(paymentId, asaasPaymentId, valorReembolsoCentavos, motivo);
            if (resultado.ok) fechar();
            else setErro(traduzErroDeReembolso(resultado.error));
          })
        }
        title="Reembolsar pagamento?"
        description={
          <div className="flex flex-col gap-3">
            <TextField label="ID do pagamento" value={paymentId} onChange={(e) => setPaymentId(e.target.value)} />
            <TextField
              label="ID do pagamento no Asaas"
              value={asaasPaymentId}
              onChange={(e) => setAsaasPaymentId(e.target.value)}
            />
            <TextField
              label="Valor (R$)"
              value={valorReembolso}
              onChange={(e) => setValorReembolso(e.target.value)}
              placeholder="150,00"
            />
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
