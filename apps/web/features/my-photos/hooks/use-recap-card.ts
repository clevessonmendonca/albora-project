"use client";

import { useEffect, useState } from "react";
import { buscarRecapPessoal, type RecapPessoal } from "@/features/my-photos/lib/recap-card";

/**
 * Estado do recap pessoal para a tela de "Minhas fotos". Começa `null` e só
 * troca se a busca voltar com dado válido — no carregamento e em qualquer
 * falha o card simplesmente não aparece (ver `buscarRecapPessoal`).
 */
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
