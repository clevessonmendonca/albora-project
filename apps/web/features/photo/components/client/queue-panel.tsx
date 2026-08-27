"use client";

import type { QueueItem } from "@albora/core";
import { MAX_ATTEMPTS, isVideoMime } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton, BottomSheet } from "@albora/ui-web";
import { webQueue } from "@/lib/queue";
import { UploadArc } from "./upload-arc";
import { QueueLabel } from "./camera-view";

function rotuloEstado(item: QueueItem, online: boolean): string {
  if (item.tentativas >= MAX_ATTEMPTS) return "Aguardando";
  if (!online) return "Vai subir quando voltar o sinal";
  if (item.tentativas > 0) return "Subindo…";
  return "Na fila";
}

function urlMiniatura(item: QueueItem): string | null {
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
        className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-75"
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
  const [itens, setItens] = useState<QueueItem[]>([]);

  const recarregar = useCallback(async () => {
    const fila = await webQueue.list();
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

  const temFalha = itens.some((i) => i.tentativas >= MAX_ATTEMPTS);

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
              {drenando ? "Enviando…" : "Enviar agora"}
            </PrimaryButton>
          )}
        </div>
      }
    >
      {!online && (
        <p className="mb-4 max-w-[34ch] text-[0.88rem] leading-[1.68] text-ink-2">
          Sem sinal. Pode fechar — a gente cuida.
        </p>
      )}

      {itens.length === 0 ? (
        <p className="m-0 text-[0.88rem] leading-[1.68] text-ink-3">Tudo enviado.</p>
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

function LinhaFila({ item, online }: { item: QueueItem; online: boolean }) {
  const url = urlMiniatura(item);
  const video = isVideoMime(item.mime);
  const falhou = item.tentativas >= MAX_ATTEMPTS;

  return (
    <li className="flex items-center gap-3 rounded-superficie bg-superficie p-2.5">
      <span className="size-14 shrink-0 overflow-hidden rounded-[calc(var(--raio)*0.85)] bg-superficie-alta">
        {url && video ? (
          <video src={url} muted playsInline preload="metadata" className="block size-full object-cover" />
        ) : url ? (
          <img src={url} alt="" className="block size-full object-cover" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9rem] font-medium text-ink">{video ? "Vídeo" : "Foto"}</span>
        <span className={`mt-0.5 block text-[0.78rem] leading-[1.5] ${falhou ? "text-ink-2" : "text-ink-3"}`}>
          {rotuloEstado(item, online)}
        </span>
      </span>
    </li>
  );
}
