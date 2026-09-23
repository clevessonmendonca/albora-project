"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@albora/ui-web";
import { AdminCard } from "@/features/admin/components/server/admin-shell";

const CHAVE = "albora.admin.primeira-visita.dispensada";

export function PrimeiraVisita() {
  const [dispensada, setDispensada] = useState(false);

  useEffect(() => {
    try {
      setDispensada(window.localStorage.getItem(CHAVE) === "1");
    } catch {
      setDispensada(false);
    }
  }, []);

  if (dispensada) return null;

  const dispensar = () => {
    try {
      window.localStorage.setItem(CHAVE, "1");
    } catch {
      /* Modo privado: some agora e volta na próxima visita. A ajuda no topo continua lá. */
    }
    setDispensada(true);
  };

  return (
    <AdminCard>
      <h2 className="tipo-subtitle m-0 mb-3 text-ink">Como isto funciona</h2>
      <ul className="m-0 mb-5 flex max-w-[56ch] list-none flex-col gap-2 p-0">
        <li className="tipo-body text-ink-2">
          Os convidados escaneiam o QR da mesa e fotografam. Sem baixar nada, sem senha.
        </li>
        <li className="tipo-body text-ink-2">
          As fotos chegam aqui e podem aparecer no telão do salão na hora.
        </li>
        <li className="tipo-body text-ink-2">
          Depois da festa, tudo vira um álbum que vocês levam embora.
        </li>
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" type="button" onClick={dispensar}>
          Entendi
        </Button>
        <p className="tipo-caption m-0 text-ink-3">
          Se alguma palavra aqui não fizer sentido, toque em Ajuda lá em cima.
        </p>
      </div>
    </AdminCard>
  );
}
