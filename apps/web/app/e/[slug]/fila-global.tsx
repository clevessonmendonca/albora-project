"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { usarFilaEvento } from "@/lib/usar-fila-evento";
import { CabecalhoFila } from "./foto/painel-fila";

export function FilaGlobal({ eventoId }: { eventoId: string }) {
  const pathname = usePathname();
  const naCamera = pathname.endsWith("/foto") || pathname.includes("/foto/");
  const { pendentes, bytesPendentes, online, drenarAgora } = usarFilaEvento(eventoId);
  const [drenando, setDrenando] = useState(false);

  if (naCamera) return null;
  if (pendentes === 0 && online) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "calc(env(safe-area-inset-top) + 0.625rem)",
        right: "1rem",
        zIndex: 20,
      }}
    >
      <CabecalhoFila
        eventoId={eventoId}
        pendentes={pendentes}
        bytesPendentes={bytesPendentes}
        online={online}
        drenando={drenando}
        onDrenar={async () => {
          setDrenando(true);
          try {
            await drenarAgora();
          } finally {
            setDrenando(false);
          }
        }}
      />
    </div>
  );
}
