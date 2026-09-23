"use client";

import React, { useState } from "react";
import { Button, Dialog, showToast } from "@albora/ui-web";
import { AdminSection } from "@/features/admin/components/server/admin-shell";

export function EncerrarEvento({
  eventId,
  status,
}: {
  eventId: string;
  status: "draft" | "active" | "ended";
}) {
  const [confirmando, setConfirmando] = useState(false);
  const [encerrando, setEncerrando] = useState(false);
  const [encerrado, setEncerrado] = useState(status === "ended");

  if (status === "draft") {
    return (
      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-2 text-ink">Encerrar o evento</h2>
        <p className="tipo-body m-0 max-w-[52ch] text-ink-2">
          Só dá para encerrar um evento que já está no ar. Publique primeiro; depois da festa,
          é aqui que vocês fecham.
        </p>
      </AdminSection>
    );
  }

  const encerrar = async () => {
    setEncerrando(true);
    try {
      const r = await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "ended" }),
      });
      if (!r.ok) throw new Error("falhou");
      setEncerrado(true);
      setConfirmando(false);
      showToast("Evento encerrado", "success");
    } catch {
      showToast("Não deu para encerrar agora. Tente de novo.", "error");
    } finally {
      setEncerrando(false);
    }
  };

  return (
    <AdminSection>
      <h2 className="tipo-subtitle m-0 mb-2 text-ink">Encerrar o evento</h2>
      <p className="tipo-body m-0 mb-4 max-w-[52ch] text-ink-2">
        {encerrado
          ? "Este evento está encerrado. As fotos continuam aqui, e o álbum segue disponível para vocês."
          : "Os convidados param de enviar fotos e o telão para de receber. As fotos que já chegaram continuam aqui, e o álbum segue disponível para vocês."}
      </p>

      {!encerrado && (
        <Button
          type="button"
          variant="danger"
          size="sm"
          disabled={encerrando}
          onClick={() => setConfirmando(true)}
        >
          Encerrar o evento
        </Button>
      )}

      <Dialog
        open={confirmando}
        onClose={() => setConfirmando(false)}
        aria-label="Confirmar encerramento do evento"
      >
        <div className="flex max-w-[34rem] flex-col gap-4 p-6">
          <h3 className="tipo-subtitle m-0 text-ink">Encerrar este evento?</h3>
          <p className="tipo-body m-0 text-ink-2">
            Depois disso ninguém mais consegue enviar foto, e o telão para de receber. Nada do que
            já chegou é apagado.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="danger"
              disabled={encerrando}
              onClick={() => void encerrar()}
            >
              {encerrando ? "Encerrando…" : "Encerrar o evento"}
            </Button>
            <Button type="button" variant="secondary" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Dialog>
    </AdminSection>
  );
}
