"use client";

import React, { useState, useTransition } from "react";
import { Button, ConfirmDialog, TextField } from "@albora/ui-web";
import {
  applySubscriptionCourtesyAction,
  cancelSubscriptionAction,
} from "@/features/console/actions";

/**
 * Cortesia e cancelamento têm botão aqui. Trocar plano (precisa de um
 * seletor de plano/valor) e reembolsar (precisa do pagamento e do valor em
 * centavos) já têm comando + server action prontos e testados
 * (`changeSubscriptionPlanAction`, `refundPaymentAction`) — a UI para os
 * dois fica para uma tela seguinte; registrado como dívida no report da T6.
 */
export function SubscriptionActions({
  subscriptionId,
  plan,
  podeMutar,
}: {
  subscriptionId: string;
  vendorId: string;
  plan: "starter" | "studio" | "agency";
  podeMutar: boolean;
  podeReembolsar: boolean;
}) {
  const [dialogo, setDialogo] = useState<"cortesia" | "cancelar" | null>(null);
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!podeMutar) return <span className="tipo-den-corpo text-ink-3">—</span>;

  return (
    <div className="flex gap-2">
      <Button type="button" variant="tertiary" onClick={() => setDialogo("cortesia")}>
        Cortesia
      </Button>
      <Button type="button" variant="tertiary" onClick={() => setDialogo("cancelar")}>
        Cancelar
      </Button>
      <ConfirmDialog
        open={dialogo === "cortesia"}
        onClose={() => setDialogo(null)}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await applySubscriptionCourtesyAction(subscriptionId, 100, motivo);
            if (resultado.ok) setDialogo(null);
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
        onClose={() => setDialogo(null)}
        onConfirm={() =>
          startTransition(async () => {
            const resultado = await cancelSubscriptionAction(subscriptionId, motivo);
            if (resultado.ok) setDialogo(null);
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
    </div>
  );
}
