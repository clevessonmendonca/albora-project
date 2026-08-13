"use client";

import { useState } from "react";
import { PrimaryButton, SecondaryButton, BottomSheet } from "@albora/ui-web";

export function ReportSheet({
  open,
  onClose,
  uploadId,
  autor,
  sessaoAutor,
  minha,
  onBloqueado,
}: {
  open: boolean;
  onClose: () => void;
  uploadId: string;
  autor?: string | undefined;
  sessaoAutor?: string | undefined;
  minha?: boolean | undefined;
  onBloqueado?: () => void;
}) {
  const [enviando, setEnviando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [motivo, setMotivo] = useState("");

  const sinalizar = async () => {
    setEnviando(true);
    try {
        const r = await fetch("/api/media/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ uploadId, motivo: motivo.trim() || undefined }),
      });
      if (r.ok) {
        setConfirmado(true);
        setMotivo("");
      }
    } finally {
      setEnviando(false);
    }
  };

  const bloquear = async () => {
    if (!sessaoAutor) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/blocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessaoId: sessaoAutor }),
      });
      if (r.ok) {
        onBloqueado?.();
        onClose();
      }
    } finally {
      setEnviando(false);
    }
  };

  const fechar = () => {
    setConfirmado(false);
    setMotivo("");
    onClose();
  };

  return (
    <BottomSheet
      title="Sinalizar foto"
      open={open}
      onClose={fechar}
      titleId="sheet-denuncia-titulo"
      footer={
        <div className="flex gap-2">
          <SecondaryButton onClick={fechar}>Fechar</SecondaryButton>
          {!confirmado && (
            <PrimaryButton disabled={enviando} onClick={() => void sinalizar()}>
              {enviando ? "Enviando…" : "Sinalizar esta foto"}
            </PrimaryButton>
          )}
        </div>
      }
    >
      {confirmado ? (
        <p className="m-0 text-[0.9rem] leading-normal text-ink-2">
          Recebido. O anfitrião vai revisar.
        </p>
      ) : (
        <>
          <p className="mb-3 mt-0 text-[0.9rem] leading-normal text-ink-2">
            Use isto se a foto não deveria estar no evento. O anfitrião decide o que fazer.
          </p>
          <label className="grid gap-[0.35rem] text-[0.85rem] text-ink-3">
            Motivo (opcional)
            <textarea
              value={motivo}
              maxLength={280}
              rows={3}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full resize-y rounded-token border border-linha bg-bg px-3 py-2.5 font-inherit text-[0.9rem] text-ink"
            />
          </label>
          {sessaoAutor && !minha && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => void bloquear()}
              className="mt-3 cursor-pointer border-none bg-transparent p-0 text-left font-inherit text-[0.85rem] text-ink-3 disabled:cursor-default"
            >
              Bloquear {autor ?? "autor"}
            </button>
          )}
        </>
      )}
    </BottomSheet>
  );
}
