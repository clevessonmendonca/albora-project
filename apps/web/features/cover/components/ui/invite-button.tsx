"use client";

import React, { useState } from "react";
import { Button } from "@albora/ui-web";

type InviteButtonProps = {
  slug: string;
  eventName: string;
};

export function InviteButton({ slug, eventName }: InviteButtonProps) {
  const [copiado, setCopiado] = useState(false);

  async function convidar() {
    const url = `${window.location.origin}/e/${encodeURIComponent(slug)}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: eventName, url });
        return;
      } catch {
        // usuário cancelou
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão
    }
  }

  return (
    <Button type="button" variant="secondary" width="full" onClick={() => void convidar()}>
      {copiado ? "Link copiado!" : "Convidar amigos"}
    </Button>
  );
}
