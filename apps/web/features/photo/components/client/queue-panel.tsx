"use client";

import type { ItemFila } from "@albora/core";
import { MAX_TENTATIVAS, ehMimeVideo } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton, BottomSheet } from "@albora/ui-web";
import { webQueue } from "@/lib/queue";
import { UploadArc } from "./upload-arc";
import { QueueLabel } from "./camera-view";

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

export function QueueHeader({
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
        className="cursor-pointer border-0 bg-transparent p-0 font-[inherit]"
      >
        {pendentes > 0 ? (
          <QueueLabel pending={pendentes} />
        ) : (
          <UploadArc
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
        open={aberto}
        onClose={() => setAberto(false)}
        onDrenar={onDrenar}
      />
    </>
  );
}

function PainelFila({
  eventoId,
  online,
  drenando,
  open,
  onClose,
  onDrenar,
}: {
  eventoId: string;
  online: boolean;
  drenando: boolean;
  open: boolean;
  onClose: () => void;
  onDrenar: () => Promise<void>;
}) {
  const [itens, setItens] = useState<ItemFila[]>([]);

  const recarregar = useCallback(async () => {
    const fila = await webQueue.listar();
    setItens(fila.filter((i) => i.eventoId === eventoId));
  }, [eventoId]);

  useEffect(() => {
    if (!open) return;
    void recarregar();
    const id = window.setInterval(() => void recarregar(), 1500);
    return () => window.clearInterval(id);
  }, [open, recarregar]);

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
    <BottomSheet
      title="Fila de envio"
      open={open}
      onClose={onClose}
      titleId="painel-fila-titulo"
      footer={
        <div className="flex gap-2">
          <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
          {temFalha && online && (
            <PrimaryButton disabled={drenando} onClick={() => void onDrenar()}>
              {drenando ? "Tentando…" : "Tentar de novo"}
            </PrimaryButton>
          )}
        </div>
      }
    >
      {!online && (
        <p className="mb-3 text-sm leading-normal text-ink-2">
          Sem sinal — a gente reenvia sozinho quando voltar.
        </p>
      )}

      {itens.length === 0 ? (
        <p className="m-0 text-sm text-ink-3">Nada na fila agora.</p>
      ) : (
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {itens.map((item) => (
            <LinhaFila key={item.id} item={item} online={online} />
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}

function LinhaFila({ item, online }: { item: ItemFila; online: boolean }) {
  const url = urlMiniatura(item);
  const video = ehMimeVideo(item.mime);
  const falhou = item.tentativas >= MAX_TENTATIVAS;

  return (
    <li className="flex items-center gap-3 rounded-token bg-bg p-2">
      <span className="size-12 shrink-0 overflow-hidden rounded-[calc(var(--raio)*0.75)] bg-linha">
        {url && video ? (
          <video src={url} muted playsInline preload="metadata" className="block size-full object-cover" />
        ) : url ? (
          <img src={url} alt="" className="block size-full object-cover" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-ink">{video ? "Vídeo" : "Foto"}</span>
        <span className={`text-xs ${falhou ? "text-critico" : "text-ink-3"}`}>
          {rotuloEstado(item, online)}
        </span>
      </span>
    </li>
  );
}
