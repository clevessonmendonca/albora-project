"use client";

import { useRef, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;

type Props = {
  eventId: string;
  initialCoverImageUrl: string | null;
  initialCoverImageKey: string | null;
};

type UploadState =
  | { fase: "idle" }
  | { fase: "uploading"; progresso: number }
  | { fase: "erro"; mensagem: string }
  | { fase: "pronto" };

export function CoverImageEditor({ eventId, initialCoverImageUrl }: Props) {
  const [url, setUrl] = useState<string | null>(initialCoverImageUrl);
  const [estado, setEstado] = useState<UploadState>({ fase: "idle" });
  const [removing, setRemoving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    const mime = file.type as (typeof ACCEPTED_MIMES)[number];
    if (!ACCEPTED_MIMES.includes(mime as never)) {
      setEstado({ fase: "erro", mensagem: "Formato não aceito. Use JPEG, PNG ou WebP." });
      return;
    }
    if (file.size > MAX_BYTES) {
      setEstado({ fase: "erro", mensagem: "Imagem grande demais. Máximo 5 MB." });
      return;
    }

    setEstado({ fase: "uploading", progresso: 0 });

    let presignData: { chave: string; put: string } | null = null;
    try {
      const r = await fetch(`/api/admin/events/${eventId}/cover-image`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mime, bytes: file.size }),
      });
      if (!r.ok) throw new Error(await r.text());
      presignData = (await r.json()) as { chave: string; put: string };
    } catch {
      setEstado({ fase: "erro", mensagem: "Não foi possível iniciar o upload." });
      return;
    }

    setEstado({ fase: "uploading", progresso: 10 });
    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", presignData!.put);
        xhr.setRequestHeader("content-type", mime);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setEstado({ fase: "uploading", progresso: Math.round(10 + (e.loaded / e.total) * 80) });
          }
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(String(xhr.status))));
        xhr.onerror = () => reject(new Error("falha de rede"));
        xhr.send(file);
      });
    } catch {
      setEstado({ fase: "erro", mensagem: "Falha ao enviar a imagem. Tente novamente." });
      return;
    }

    setEstado({ fase: "uploading", progresso: 92 });
    try {
      const r = await fetch(`/api/admin/events/${eventId}/cover-image/confirm`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chave: presignData.chave, mime }),
      });
      if (!r.ok) throw new Error(await r.text());
      const data = (await r.json()) as { chave: string; url: string };
      setUrl(data.url);
      setEstado({ fase: "pronto" });
    } catch {
      setEstado({ fase: "erro", mensagem: "Upload concluído, mas a confirmação falhou. Recarregue a página." });
    }
  }

  async function remover() {
    setRemoving(true);
    try {
      const r = await fetch(`/api/admin/events/${eventId}/cover-image`, { method: "DELETE" });
      if (!r.ok) throw new Error(await r.text());
      setUrl(null);
      setEstado({ fase: "idle" });
    } catch {
      setEstado({ fase: "erro", mensagem: "Não foi possível remover a imagem." });
    } finally {
      setRemoving(false);
    }
  }

  const busy = estado.fase === "uploading" || removing;

  return (
    <AdminSection>
      <h2 className="tipo-subtitle m-0">Imagem de capa</h2>
      <p className="tipo-caption m-0 mt-1.5 max-w-[38rem] text-ink-2">
        Aparece como hero na capa do app do convidado, no lugar da primeira foto do álbum. JPEG,
        PNG ou WebP — máximo 5 MB.
      </p>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (busy) return;
            const file = e.dataTransfer.files?.[0];
            if (file) void handleFile(file);
          }}
          className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-token border-2 border-dashed p-6 text-center transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] disabled:cursor-not-allowed disabled:opacity-50 ${
            dragOver ? "border-acento bg-superficie-alta" : "border-linha bg-bg hover:border-acento-texto"
          }`}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden className="text-ink-3">
            <path
              d="M11 14.5V4M11 4L6.5 8.5M11 4l4.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M4 15v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <p className="m-0 font-titulo text-sm text-ink">
            {dragOver ? "Solte para enviar" : url ? "Trocar imagem de capa" : "Arraste uma imagem aqui"}
          </p>
          <p className="tipo-label m-0 text-ink-3">ou clique para escolher · JPEG, PNG, WebP · até 5 MB</p>
        </button>

        <div className="relative aspect-video w-full overflow-hidden rounded-token border border-linha bg-superficie-alta sm:aspect-auto sm:h-full">
          {url ? (
            <img src={url} alt="Imagem de capa atual" className="absolute inset-0 size-full object-cover" />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-1.5 p-3 text-center">
              <span className="tipo-label text-ink-3">Sem imagem</span>
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_MIMES.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {url && (
        <div className="mt-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => void remover()}
            className="min-h-11 cursor-pointer rounded-pilula border border-linha bg-bg px-4 font-titulo text-sm text-critico transition-colors duration-instantaneo ease-mola hover:border-critico disabled:cursor-not-allowed disabled:opacity-50"
          >
            {removing ? "Removendo…" : "Remover imagem"}
          </button>
        </div>
      )}

      {estado.fase === "uploading" && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-ink-2">
            <span>Enviando…</span>
            <span className="tabular-nums">{estado.progresso}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={estado.progresso}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progresso do envio da imagem de capa"
            className="h-1.5 w-full overflow-hidden rounded-full bg-superficie-alta"
          >
            <div
              className="h-full bg-acento transition-[width] duration-200"
              style={{ width: `${estado.progresso}%` }}
            />
          </div>
        </div>
      )}

      {estado.fase === "pronto" && (
        <span className="mt-4 inline-flex items-center gap-1.5 rounded-pilula border border-acento-texto px-3 py-1.5 font-titulo text-[0.8125rem] text-acento-texto">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6l2.5 2.5L10 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Imagem salva
        </span>
      )}

      {estado.fase === "erro" && (
        <p role="alert" className="mt-4 text-sm text-critico">
          {estado.mensagem}
        </p>
      )}
    </AdminSection>
  );
}
