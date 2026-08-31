"use client";

import { useEffect, useState } from "react";

type SuccessStepProps = {
  uploadId: string;
  onRestart: () => void;
  onViewFeed: () => void;
  showPwaInstall?: boolean;
  onInstallPwa?: () => void;
};

/**
 * Etapa de sucesso após upload.
 * Mostra confirmação e oferece próximas ações.
 */
export function SuccessStep({
  uploadId,
  onRestart,
  onViewFeed,
  showPwaInstall = false,
  onInstallPwa,
}: SuccessStepProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Anima entrada
    const timer = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      className={`grid gap-6 transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="text-center">
        <p className="mb-3 text-[3rem] leading-none" aria-hidden>
          ✓
        </p>
        <h2 className="font-titulo text-[1.5rem] font-normal">
          Foto enviada!
        </h2>
        <p className="mt-2 text-[0.9rem] text-ink-2">
          Sua foto já está no álbum do evento
        </p>
      </div>

      {showPwaInstall && onInstallPwa && (
        <div className="rounded-superficie border border-acento bg-acento/10 p-4">
          <p className="mb-3 text-[0.9rem] font-medium text-ink">
            📱 Instale o app para enviar fotos mais rápido
          </p>
          <button
            type="button"
            onClick={onInstallPwa}
            className="min-h-10 w-full cursor-pointer rounded-pilula border-none bg-acento px-4 text-[0.85rem] font-medium text-sobre-acento transition-opacity hover:opacity-90"
          >
            Instalar agora
          </button>
        </div>
      )}

      <div className="grid gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="min-h-12 cursor-pointer rounded-pilula border-none bg-acento px-6 text-[0.9rem] font-medium text-sobre-acento transition-opacity hover:opacity-90"
        >
          Tirar outra foto
        </button>

        <button
          type="button"
          onClick={onViewFeed}
          className="min-h-12 cursor-pointer rounded-pilula border border-linha bg-transparent px-6 text-[0.9rem] text-ink transition-colors hover:border-acento-texto"
        >
          Ver todas as fotos
        </button>
      </div>

      <p className="text-center text-[0.75rem] text-ink-3">
        ID: {uploadId.slice(0, 12)}...
      </p>
    </div>
  );
}
