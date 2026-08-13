"use client";

import { useState } from "react";
import { BotaoPrimario, BotaoSecundario, SheetBaixo } from "../../telas/shell-convidado";

export function SheetDenuncia({
  aberto,
  onFechar,
  uploadId,
  autor,
  sessaoAutor,
  minha,
  onBloqueado,
}: {
  aberto: boolean;
  onFechar: () => void;
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
      const r = await fetch("/api/midia/denuncia", {
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
      const r = await fetch("/api/bloqueios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ sessaoId: sessaoAutor }),
      });
      if (r.ok) {
        onBloqueado?.();
        onFechar();
      }
    } finally {
      setEnviando(false);
    }
  };

  const fechar = () => {
    setConfirmado(false);
    setMotivo("");
    onFechar();
  };

  return (
    <SheetBaixo
      titulo="Sinalizar foto"
      aberto={aberto}
      onFechar={fechar}
      idTitulo="sheet-denuncia-titulo"
      rodape={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <BotaoSecundario onClick={fechar}>Fechar</BotaoSecundario>
          {!confirmado && (
            <BotaoPrimario desabilitado={enviando} onClick={() => void sinalizar()}>
              {enviando ? "Enviando…" : "Sinalizar esta foto"}
            </BotaoPrimario>
          )}
        </div>
      }
    >
      {confirmado ? (
        <p style={{ margin: 0, fontSize: "0.9rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
          Recebido. O anfitrião vai revisar.
        </p>
      ) : (
        <>
          <p style={{ margin: "0 0 0.75rem", fontSize: "0.9rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
            Use isto se a foto não deveria estar no evento. O anfitrião decide o que fazer.
          </p>
          <label style={{ display: "grid", gap: "0.35rem", fontSize: "0.85rem", color: "var(--ink-3)" }}>
            Motivo (opcional)
            <textarea
              value={motivo}
              maxLength={280}
              rows={3}
              onChange={(e) => setMotivo(e.target.value)}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                font: "inherit",
                fontSize: "0.9rem",
                border: "1px solid var(--linha)",
                borderRadius: "var(--raio)",
                background: "var(--bg)",
                color: "var(--ink)",
                resize: "vertical",
              }}
            />
          </label>
          {sessaoAutor && !minha && (
            <button
              type="button"
              disabled={enviando}
              onClick={() => void bloquear()}
              style={{
                marginTop: "0.75rem",
                border: "none",
                background: "transparent",
                color: "var(--ink-3)",
                font: "inherit",
                fontSize: "0.85rem",
                padding: 0,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              Bloquear {autor ?? "autor"}
            </button>
          )}
        </>
      )}
    </SheetBaixo>
  );
}
