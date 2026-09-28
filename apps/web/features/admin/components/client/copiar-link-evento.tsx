"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { botaoDoPainel } from "@/features/admin/components/server/kit-do-painel";

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
    <button type="button" onClick={() => void copiar()} className={botaoDoPainel({ variant: "primary" })}>
      {copiado ? (
        <>
          <Check size={16} aria-hidden />
          Link copiado
        </>
      ) : (
        "Copiar link"
      )}
    </button>
  );
}
