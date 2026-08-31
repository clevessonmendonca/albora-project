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
      className={`inline-flex items-center gap-1.5 ${adminClasses.secondaryButton}`}
    >
      {copiado ? (
        <>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path
              d="M2 6l2.5 2.5L10 3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Link copiado!
        </>
      ) : (
        `Copiar link · /e/${slug}`
      )}
    </button>
  );
}
