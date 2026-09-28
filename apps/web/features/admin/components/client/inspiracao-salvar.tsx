"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkCheck } from "lucide-react";

export function InspiracaoSalvar({
  ideiaId,
  titulo,
  salva: inicial,
}: {
  ideiaId: string;
  titulo: string;
  salva: boolean;
}) {
  const router = useRouter();
  const [salva, setSalva] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);

  async function alternar() {
    const alvo = !salva;
    setOcupado(true);
    setSalva(alvo);

    try {
      const resposta = await fetch(`/api/admin/inspiracao/${ideiaId}`, {
        method: alvo ? "PUT" : "DELETE",
      });
      if (!resposta.ok) {
        setSalva(!alvo);
        return;
      }
      router.refresh();
    } catch {
      setSalva(!alvo);
    } finally {
      setOcupado(false);
    }
  }

  const Icone = salva ? BookmarkCheck : Bookmark;

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={ocupado}
      aria-pressed={salva}
      aria-label={salva ? `Remover "${titulo}" dos salvos` : `Salvar "${titulo}"`}
      className={[
        "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-[9px] border px-3 text-[13px] font-semibold",
        "transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
        salva
          ? "border-acento-borda bg-acento-fundo text-acento-texto"
          : "border-linha bg-superficie text-ink-2 hover:text-ink",
      ].join(" ")}
    >
      <Icone size={16} aria-hidden />
      {salva ? "Salva" : "Salvar"}
    </button>
  );
}
