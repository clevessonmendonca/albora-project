"use client";

import { useState } from "react";

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
    <button
      type="button"
      onClick={() => void convidar()}
      className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-pilula border border-linha bg-transparent px-4 font-inherit text-[0.9375rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
    >
      {copiado ? "Link copiado!" : "Convidar amigos"}
    </button>
  );
}
