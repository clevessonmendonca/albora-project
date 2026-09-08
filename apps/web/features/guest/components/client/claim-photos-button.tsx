"use client";

import React from "react";
import { SecondaryButton } from "@albora/ui-web";

export type ClaimPhotosButtonProps = { eventId: string };

/**
 * "Receber minhas fotos" — nunca antes da primeira foto (ADR 0018). Só
 * renderizado pelo pai dentro de uma sessão de convidado já ativa.
 * `eventId` é público (aparece na própria URL `/e/{slug}` do evento) e
 * NÃO é credencial — a rota `/auth/google/start` exige recebê-lo para
 * conferir que bate com a sessão de convidado do cookie
 * (`isSameEventSession`), mas nunca aceita `guestSessionId` do cliente:
 * esse é sempre resolvido server-side, a partir do próprio cookie da
 * sessão.
 */
export function ClaimPhotosButton({ eventId }: ClaimPhotosButtonProps) {
  return (
    <SecondaryButton
      onClick={() =>
        window.location.assign(`/auth/google/start?surface=guest&eventId=${encodeURIComponent(eventId)}`)
      }
    >
      Receber minhas fotos
    </SecondaryButton>
  );
}
