"use client";

import type { QueueItem } from "@albora/core";
import { isVideoMime, shouldGiveUp } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton, BottomSheet } from "@albora/ui-web";
import { webQueue } from "@/lib/queue";
import { reiniciarItemFalho, reiniciarTodosFalhos } from "@/lib/queue-retry";
import { rotuloEstadoFila } from "@/lib/queue-status";
import { UploadArc } from "./upload-arc";
import { QueueLabel } from "./camera-view";

function rotuloEstado(item: Parameters<typeof rotuloEstadoFila>[0], online: boolean): string {
  return rotuloEstadoFila(item, { online }).estado;
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
        className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center border-0 bg-transparent p-0 font-[inherit] transition-[opacity,transform] duration-instantaneo ease-mola hover:opacity-75 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
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

  const temFalha = itens.some((i) => shouldGiveUp(i));

  const tentarDeNovo = useCallback(async () => {
    await reiniciarTodosFalhos(webQueue);
    await onDrenar();
    await recarregar();
  }, [onDrenar, recarregar]);

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
            <PrimaryButton disabled={drenando} onClick={() => void tentarDeNovo()}>
              {drenando ? "Enviando…" : "Tentar de novo"}
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
            <LinhaFila
              key={item.id}
              item={item}
              online={online}
              drenando={drenando}
              onRetry={async () => {
                await reiniciarItemFalho(webQueue, item.id);
                await onDrenar();
                await recarregar();
              }}
            />
          ))}
        </ul>
      )}
    </BottomSheet>
  );
}

function LinhaFila({
  item,
  online,
  drenando,
  onRetry,
}: {
  item: QueueItem;
  online: boolean;
  drenando: boolean;
  onRetry: () => Promise<void>;
}) {
  const url = urlMiniatura(item);
  const video = isVideoMime(item.mime);
  const { falhou } = rotuloEstadoFila(item, { online });

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
        <span className={`mt-0.5 block text-[0.78rem] leading-[1.5] ${falhou ? "text-critico" : "text-ink-3"}`}>
          {rotuloEstado(item, online)}
        </span>
        {item.tentativas > 0 && !falhou && (
          <span className="mt-0.5 block text-[0.72rem] text-ink-3">
            Tentativa {item.tentativas}
          </span>
        )}
      </span>
      {falhou && online && (
        <SecondaryButton disabled={drenando} onClick={() => void onRetry()}>
          Tentar de novo
        </SecondaryButton>
      )}
    </li>
  );
}
