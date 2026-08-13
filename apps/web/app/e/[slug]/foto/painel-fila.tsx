"use client";

import type { ItemFila } from "@albora/core";
import { MAX_TENTATIVAS, ehMimeVideo } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { BotaoPrimario, BotaoSecundario, SheetBaixo } from "../../../telas/shell-convidado";
import { filaWeb } from "@/lib/fila";
import { ArcoDeEnvio } from "./arco-de-envio";
import { RotuloFila } from "./visao-camera";

function rotuloEstado(item: ItemFila, online: boolean): string {
  if (item.tentativas >= MAX_TENTATIVAS) return "Falhou · tentar de novo";
  if (!online) return "Na fila · sem sinal";
  if (item.tentativas > 0) return "Enviando…";
  return "Na fila";
}

function urlMiniatura(item: ItemFila): string | null {
  const corpo = item.thumb ?? item.poster ?? item.corpo;
  if (corpo.tipo !== "blob") return null;
  return URL.createObjectURL(corpo.blob);
}

export function CabecalhoFila({
  eventoId,
  pendentes,
  bytesPendentes,
  online,
  onDrenar,
  drenando,
}: {
  eventoId: string;
  pendentes: number;
  bytesPendentes: number;
  online: boolean;
  onDrenar: () => Promise<void>;
  drenando: boolean;
}) {
  const [aberto, setAberto] = useState(false);

  if (pendentes === 0 && online) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-haspopup="dialog"
        aria-expanded={aberto}
        style={{
          padding: 0,
          border: "none",
          background: "none",
          font: "inherit",
          cursor: "pointer",
        }}
      >
        {pendentes > 0 ? (
          <RotuloFila pendentes={pendentes} />
        ) : (
          <ArcoDeEnvio
            pendentes={pendentes}
            bytesPendentes={bytesPendentes}
            online={online}
          />
        )}
      </button>

      <PainelFila
        eventoId={eventoId}
        online={online}
        drenando={drenando}
        aberto={aberto}
        onFechar={() => setAberto(false)}
        onDrenar={onDrenar}
      />
    </>
  );
}

function PainelFila({
  eventoId,
  online,
  drenando,
  aberto,
  onFechar,
  onDrenar,
}: {
  eventoId: string;
  online: boolean;
  drenando: boolean;
  aberto: boolean;
  onFechar: () => void;
  onDrenar: () => Promise<void>;
}) {
  const [itens, setItens] = useState<ItemFila[]>([]);

  const recarregar = useCallback(async () => {
    const fila = await filaWeb.listar();
    setItens(fila.filter((i) => i.eventoId === eventoId));
  }, [eventoId]);

  useEffect(() => {
    if (!aberto) return;
    void recarregar();
    const id = window.setInterval(() => void recarregar(), 1500);
    return () => window.clearInterval(id);
  }, [aberto, recarregar]);

  useEffect(() => {
    const urls: string[] = [];
    for (const item of itens) {
      const url = urlMiniatura(item);
      if (url) urls.push(url);
    }
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [itens]);

  const temFalha = itens.some((i) => i.tentativas >= MAX_TENTATIVAS);

  return (
    <SheetBaixo
      titulo="Fila de envio"
      aberto={aberto}
      onFechar={onFechar}
      idTitulo="painel-fila-titulo"
      rodape={
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <BotaoSecundario onClick={onFechar}>Fechar</BotaoSecundario>
          {temFalha && online && (
            <BotaoPrimario desabilitado={drenando} onClick={() => void onDrenar()}>
              {drenando ? "Tentando…" : "Tentar de novo"}
            </BotaoPrimario>
          )}
        </div>
      }
    >
      {!online && (
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.875rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
          Sem sinal — a gente reenvia sozinho quando voltar.
        </p>
      )}

      {itens.length === 0 ? (
        <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--ink-3)" }}>
          Nada na fila agora.
        </p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.625rem" }}>
          {itens.map((item) => (
            <LinhaFila key={item.id} item={item} online={online} />
          ))}
        </ul>
      )}
    </SheetBaixo>
  );
}

function LinhaFila({ item, online }: { item: ItemFila; online: boolean }) {
  const url = urlMiniatura(item);
  const video = ehMimeVideo(item.mime);
  const falhou = item.tentativas >= MAX_TENTATIVAS;

  return (
    <li
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.5rem",
        borderRadius: "var(--raio)",
        backgroundColor: "var(--bg)",
      }}
    >
      <span
        style={{
          flex: "none",
          width: "3rem",
          height: "3rem",
          overflow: "hidden",
          borderRadius: "calc(var(--raio) * 0.75)",
          backgroundColor: "var(--linha)",
        }}
      >
        {url && video ? (
          <video src={url} muted playsInline preload="metadata" style={miniatura} />
        ) : url ? (
          <img src={url} alt="" style={miniatura} />
        ) : null}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: "0.875rem", color: "var(--ink)" }}>
          {video ? "Vídeo" : "Foto"}
        </span>
        <span
          style={{
            fontSize: "0.75rem",
            color: falhou ? "var(--critico)" : "var(--ink-3)",
          }}
        >
          {rotuloEstado(item, online)}
        </span>
      </span>
    </li>
  );
}

const miniatura: React.CSSProperties = {
  width: "100%",
  height: "100%",
  objectFit: "cover",
  display: "block",
};
