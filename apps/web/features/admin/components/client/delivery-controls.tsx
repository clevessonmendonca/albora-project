"use client";

import { Switch } from "@albora/ui-web";
import React, { useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

type DisparoResultado = { enviados: number; pendentes: number };

type Props = {
  eventId: string;
  initialDeliveryOpensAt: string | null;
};

export function DeliveryControls({ eventId, initialDeliveryOpensAt }: Props) {
  const [deliveryOpensAt, setDeliveryOpensAt] = useState(initialDeliveryOpensAt);
  const [savingGate, setSavingGate] = useState(false);
  const [disparando, setDisparando] = useState(false);
  const [error, setError] = useState(false);
  const [resultado, setResultado] = useState<DisparoResultado | null>(null);

  const gateAberto = deliveryOpensAt !== null;

  const toggleGate = async (abrir: boolean) => {
    setSavingGate(true);
    setError(false);
    const anterior = deliveryOpensAt;
    const proximo = abrir ? new Date().toISOString() : null;
    setDeliveryOpensAt(proximo);

    try {
      const r = await fetch(`/api/admin/events/${eventId}/entrega`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deliveryOpensAt: proximo }),
      });
      if (!r.ok) throw new Error("falhou");
      const body = (await r.json()) as { deliveryOpensAt: string | null };
      setDeliveryOpensAt(body.deliveryOpensAt);
    } catch {
      setDeliveryOpensAt(anterior);
      setError(true);
    } finally {
      setSavingGate(false);
    }
  };

  const disparar = async () => {
    setDisparando(true);
    setError(false);
    try {
      const r = await fetch(`/api/admin/events/${eventId}/entrega/disparar`, {
        method: "POST",
      });
      if (!r.ok) throw new Error("falhou");
      const body = (await r.json()) as DisparoResultado;
      setResultado(body);
    } catch {
      setError(true);
    } finally {
      setDisparando(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="tipo-subtitle block text-ink">Liberar entrega das fotos</span>
          <span className="tipo-caption mt-1 block text-ink-3">
            {gateAberto
              ? "Convidados já recebem o link da galeria."
              : "Convidados ainda não recebem o link da galeria."}
          </span>
        </div>
        <Switch
          checked={gateAberto}
          label={gateAberto ? "Fechar entrega das fotos" : "Liberar entrega das fotos"}
          disabled={savingGate}
          onChange={(v) => void toggleGate(v)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!gateAberto || disparando}
          onClick={() => void disparar()}
          className={`${adminClasses.primaryButton} ${
            !gateAberto || disparando ? "opacity-60" : ""
          }`}
        >
          {disparando ? "Enviando…" : "Enviar agora"}
        </button>
        {resultado && (
          <span className="tipo-caption text-ink-3">
            {resultado.enviados} enviadas, {resultado.pendentes} pendentes
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="tipo-body m-0 text-critico">
          Não salvou agora. Tente de novo.
        </p>
      )}
    </div>
  );
}
