"use client";

import { useState } from "react";
import { botaoDoPainel } from "@/features/admin/components/server/kit-do-painel";

export function ConvidadosCopiarConvite({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // sem permissão de clipboard — o link continua selecionável no campo ao lado
    }
  }

  return (
    <button type="button" onClick={() => void copiar()} className={botaoDoPainel({})}>
      {copiado ? "Copiado!" : "Copiar"}
    </button>
  );
}
