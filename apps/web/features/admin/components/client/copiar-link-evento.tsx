"use client";

import { useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

export function CopiarLinkEvento({ slug }: { slug: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    const url = `${window.location.origin}/e/${encodeURIComponent(slug)}`;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Link do evento", url });
        return;
      } catch {
        // usuário cancelou — tenta clipboard silenciosamente
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão de clipboard — ignora
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copiar()}
      className={adminClasses.secondaryButton}
    >
      {copiado ? "Link copiado!" : `Copiar link · /e/${slug}`}
    </button>
  );
}
