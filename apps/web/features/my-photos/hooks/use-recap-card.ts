"use client";

import { useEffect, useState } from "react";
import { buscarRecapPessoal, type RecapPessoal } from "@/features/my-photos/lib/recap-card";

/** Estado do recap pessoal: começa `null` e só troca com dado válido — em qualquer falha o card não aparece. */
export function useRecapCard(): RecapPessoal | null {
  const [recap, setRecap] = useState<RecapPessoal | null>(null);

  useEffect(() => {
    let cancelado = false;

    void buscarRecapPessoal().then((resultado) => {
      if (!cancelado) setRecap(resultado);
    });

    return () => {
      cancelado = true;
    };
  }, []);

  return recap;
}
