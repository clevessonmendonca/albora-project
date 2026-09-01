"use client";

import { useState } from "react";
import type { MotivoDeDenuncia } from "@albora/core";
import { PrimaryButton, SecondaryButton, BottomSheet } from "@albora/ui-web";

const OPCOES: { kind: MotivoDeDenuncia; rotulo: string; ajuda: string }[] = [
  {
    kind: "ofensivo",
    rotulo: "Esta foto não deveria estar no evento",
    ajuda: "Conteúdo ofensivo ou que não combina com a festa.",
  },
  {
    kind: "aparece_na_foto",
    rotulo: "Sou eu nessa foto — tire do telão e do álbum",
    ajuda: "Você não enviou, mas aparece nela. O anfitrião decide. Nada some sozinho.",
  },
];

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
  const [kind, setKind] = useState<MotivoDeDenuncia | null>(null);

  const opcoes = minha ? OPCOES.filter((o) => o.kind !== "aparece_na_foto") : OPCOES;

  const sinalizar = async () => {
    if (kind === null) return;
    setEnviando(true);
    try {
      const r = await fetch("/api/media/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          uploadId,
          kind,
          motivo: motivo.trim() || undefined,
        }),
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
    setKind(null);
    onClose();
  };

  return (
    <BottomSheet
      title="Esta foto"
      open={open}
      onClose={fechar}
      titleId="sheet-denuncia-titulo"
      footer={
        <div className="flex gap-2">
          <SecondaryButton onClick={fechar}>Fechar</SecondaryButton>
          {!confirmado && (
            <PrimaryButton disabled={enviando || kind === null} onClick={() => void sinalizar()}>
              {enviando ? "Enviando…" : "Confirmar denúncia"}
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
            O anfitrião decide o que fazer. Nada some sozinho.
          </p>
          <fieldset className="m-0 grid gap-2 border-0 p-0">
            <legend className="mb-1 text-[0.85rem] text-ink-3">O que aconteceu?</legend>
            {opcoes.map((o) => (
              <label
                key={o.kind}
                className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-2.5 rounded-token border border-linha px-3 py-2.5 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta"
              >
                <input
                  type="radio"
                  name="denuncia-kind"
                  value={o.kind}
                  checked={kind === o.kind}
                  onChange={() => setKind(o.kind)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-[0.9rem] text-ink">{o.rotulo}</span>
                  <span className="mt-0.5 block text-[0.8rem] leading-snug text-ink-3">
                    {o.ajuda}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>
          {kind !== null && (
            <label className="mt-3 grid gap-[0.35rem] text-[0.85rem] text-ink-3">
              Motivo (opcional)
              <textarea
                value={motivo}
                maxLength={280}
                rows={3}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full resize-y rounded-token border border-linha bg-bg px-3 py-2.5 font-inherit text-[0.9rem] text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
              />
              {motivo.length > 0 && (
                <span className="text-right text-[0.6875rem] tabular-nums text-ink-3">
                  {280 - motivo.length}
                </span>
              )}
            </label>
          )}
          {sessaoAutor && !minha && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => void bloquear()}
              className="mt-3 cursor-pointer border-none bg-transparent p-0 text-left font-inherit text-[0.85rem] text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink disabled:cursor-default"
            >
              Bloquear {autor ?? "autor"}
            </button>
          )}
        </>
      )}
    </BottomSheet>
  );
}
