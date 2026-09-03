"use client";

import { useEffect, useState } from "react";
import { SecondaryButton } from "@albora/ui-web";

type EditorStepProps = {
  arquivo: File;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Etapa de edição/preview de foto.
 * Mostra preview e permite aplicar filtros (LUT no futuro).
 */
export function EditorStep({ arquivo, onConfirm, onCancel }: EditorStepProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(arquivo);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [arquivo]);

  const isVideo = arquivo.type.startsWith("video/");

  return (
    <div className="grid gap-4">
      <h2 className="font-titulo text-[1.2rem] font-normal">
        {isVideo ? "Preview do vídeo" : "Preview da foto"}
      </h2>

      <div className="relative overflow-hidden rounded-superficie border border-linha bg-superficie-2">
        {previewUrl &&
          (isVideo ? (
            <video
              src={previewUrl}
              controls
              className="h-auto w-full"
              style={{ maxHeight: "60vh" }}
            />
          ) : (
            <img
              src={previewUrl}
              alt="Preview"
              className="h-auto w-full object-contain"
              style={{ maxHeight: "60vh" }}
            />
          ))}
      </div>

      <p className="text-[0.85rem] text-ink-2">
        Tamanho: {(arquivo.size / (1024 * 1024)).toFixed(2)}MB
      </p>

      <div className="grid gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-6 text-[0.9rem] font-medium text-sobre-acento transition-opacity hover:opacity-90"
        >
          Continuar
        </button>

        <SecondaryButton onClick={onCancel}>
          Tirar outra
        </SecondaryButton>
      </div>
    </div>
  );
}
