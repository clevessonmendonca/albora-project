"use client";

import React from "react";
import { Card } from "@albora/ui-web";
import { ClaimPhotosButton } from "@/features/guest/components/client/claim-photos-button";

/**
 * Card de retenção da tela "Você" (REFATORACAO §111/§126): o convidado já viu
 * o valor, aqui ele guarda as próprias fotos e recebe o álbum depois. O login
 * é tardio e opcional (ADR 0018) — reusa o `ClaimPhotosButton` (Google SSO),
 * que só renderiza dentro de uma sessão de convidado ativa.
 */
export function RetentionCard({ eventId }: { eventId: string }) {
  return (
    <Card elevation={1} className="grid gap-2 text-center">
      <p className="tipo-subtitle m-0 text-ink">Salve suas fotos e receba o álbum</p>
      <p className="tipo-caption m-0 text-ink-2">
        Sem senha. Só pra guardar o que é seu — e mandar o álbum depois.
      </p>
      <div className="mt-2 flex justify-center">
        <ClaimPhotosButton eventId={eventId} />
      </div>
    </Card>
  );
}
