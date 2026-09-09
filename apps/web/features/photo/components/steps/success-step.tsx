"use client";

import React, { useEffect, useState } from "react";
import { Card, PrimaryButton, SecondaryButton } from "@albora/ui-web";
import { ClaimPhotosButton } from "@/features/guest/components/client/claim-photos-button";

type SuccessStepProps = {
  uploadId: string;
  onRestart: () => void;
  onViewFeed: () => void;
  showPwaInstall?: boolean;
  onInstallPwa?: () => void;
  /** Presente só dentro de uma sessão de convidado ativa (ADR 0018) — sem ele, o botão de reivindicar nunca renderiza. */
  eventId?: string;
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
  onRestart,
  onViewFeed,
  showPwaInstall = false,
  onInstallPwa,
  eventId,
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
        <h2 className="tipo-display m-0">Sua foto entrou na festa</h2>
        <ul className="m-0 mt-4 inline-flex flex-col gap-1.5 p-0 text-left">
          <RecompensaItem>No álbum</RecompensaItem>
          <RecompensaItem>Pode aparecer no telão</RecompensaItem>
        </ul>
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
        <PrimaryButton onClick={onRestart}>Tirar outra</PrimaryButton>
        <SecondaryButton onClick={onViewFeed}>Ver no feed</SecondaryButton>
      </div>

      {eventId && (
        <div className="text-center">
          <ClaimPhotosButton eventId={eventId} />
        </div>
      )}
    </div>
  );
}

/** Confirmação da recompensa (redesign §3.2) — check âmbar + o que aconteceu com a foto. */
function RecompensaItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 tipo-body text-ink-2">
      <span aria-hidden className="text-acento-texto">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6 9 17l-5-5" />
        </svg>
      </span>
      {children}
    </li>
  );
}
