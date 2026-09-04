"use client";

import { useEffect, useState } from "react";
import { Card, PrimaryButton, SecondaryButton } from "@albora/ui-web";

type SuccessStepProps = {
  uploadId: string;
  onRestart: () => void;
  onViewFeed: () => void;
  showPwaInstall?: boolean;
  onInstallPwa?: () => void;
};

const ESTILO = `
@keyframes sucesso-amanhecer {
  from { opacity: 0; transform: translateY(0.6rem); }
  to   { opacity: 1; transform: none; }
}
.sucesso-entra { animation: sucesso-amanhecer var(--tempo-lento) var(--curva) both; }
@media (prefers-reduced-motion: reduce) {
  .sucesso-entra { animation: none; }
}
`;

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
    const timer = setTimeout(() => setShow(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`grid gap-6 ${show ? "sucesso-entra" : "opacity-0"}`}>
      <style>{ESTILO}</style>

      <div className="text-center">
        <h2 className="tipo-display m-0">Foto enviada!</h2>
        <p className="mt-2 tipo-body text-ink-2">
          Sua foto já está no álbum do evento
        </p>
      </div>

      {showPwaInstall && onInstallPwa && (
        <Card elevation={1} className="grid gap-3">
          <p className="m-0 tipo-caption font-medium text-ink">
            Instale o app para enviar fotos mais rápido
          </p>
          <PrimaryButton onClick={onInstallPwa}>Instalar agora</PrimaryButton>
        </Card>
      )}

      <div className="grid gap-3">
        <PrimaryButton onClick={onRestart}>Tirar outra foto</PrimaryButton>
        <SecondaryButton onClick={onViewFeed}>Ver todas as fotos</SecondaryButton>
      </div>

      <p className="text-center tipo-caption text-ink-3">
        ID: {uploadId.slice(0, 12)}...
      </p>
    </div>
  );
}
