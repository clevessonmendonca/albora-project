"use client";

import React, { useState } from "react";
import { BottomSheet } from "@albora/ui-web";
import { CircleHelp } from "lucide-react";
import { GLOSSARIO } from "@/features/admin/lib/glossario";

export function AjudaDoPainel() {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-haspopup="dialog"
        className="flex min-h-11 cursor-pointer items-center gap-2 rounded-pilula border-none bg-transparent px-3 text-sm text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
      >
        <CircleHelp size={18} aria-hidden />
        Ajuda
      </button>

      <BottomSheet title="O que cada palavra quer dizer" open={aberta} onClose={() => setAberta(false)}>
        <dl className="m-0 flex flex-col gap-5 pb-2">
          {GLOSSARIO.map((termo) => (
            <div key={termo.id}>
              <dt className="m-0 font-titulo text-[1.0625rem] text-ink">{termo.termo}</dt>
              <dd className="tipo-body m-0 mt-1 max-w-[52ch] text-ink-2">{termo.frase}</dd>
            </div>
          ))}
        </dl>
      </BottomSheet>
    </>
  );
}
