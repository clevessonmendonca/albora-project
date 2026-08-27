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

    // 1. Presign
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

    // 2. PUT direto no storage (com XHR para progresso)
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

    // 3. Confirm
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
      <h2 className="mb-3 mt-0 font-titulo text-lg">Imagem de capa</h2>
      <p className="mb-5 mt-0 leading-relaxed text-ink-2">
        Aparece como hero na capa do app do convidado, no lugar da primeira foto do álbum.
        JPEG, PNG ou WebP — máximo 5 MB.
      </p>

      {url && (
        <div className="mb-5">
          <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-token border border-linha">
            <img
              src={url}
              alt="Imagem de capa atual"
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-token border border-linha bg-bg px-4 py-2 font-titulo text-sm text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto disabled:cursor-not-allowed disabled:opacity-50"
        >
          {url ? "Trocar imagem" : "Escolher imagem"}
        </button>

        {url && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void remover()}
            className="cursor-pointer rounded-token border border-linha bg-bg px-4 py-2 font-titulo text-sm text-critico transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-critico disabled:cursor-not-allowed disabled:opacity-50"
          >
            {removing ? "Removendo…" : "Remover"}
          </button>
        )}

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

      {estado.fase === "uploading" && (
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-ink-2">
            <span>Enviando…</span>
            <span>{estado.progresso}%</span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-superficie-alta">
            <div
              className="h-full bg-acento transition-[width] duration-200"
              style={{ width: `${estado.progresso}%` }}
            />
          </div>
        </div>
      )}

      {estado.fase === "pronto" && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-pilula border border-acento-texto px-3 py-1.5 font-titulo text-[0.8125rem] text-acento-texto">
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
        <p className="mt-3 text-sm text-critico">{estado.mensagem}</p>
      )}

    </AdminSection>
  );
}
