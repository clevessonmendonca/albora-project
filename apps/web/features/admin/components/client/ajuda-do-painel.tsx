"use client";

import { useState } from "react";
import { BottomSheet } from "@albora/ui-web";
import { GLOSSARIO } from "@/features/admin/lib/glossario";

export function AjudaDoPainel() {
  const [aberta, setAberta] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-haspopup="dialog"
        className="min-h-11 cursor-pointer rounded-pilula border border-linha bg-transparent px-[1.1rem] text-[0.95rem] text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
      >
        Ajuda
      </button>

      <BottomSheet
        title="O que cada palavra quer dizer"
        open={aberta}
        onClose={() => setAberta(false)}
      >
        <dl className="m-0 flex flex-col gap-5 pb-2">
          {GLOSSARIO.map((termo) => (
            <div key={termo.id}>
              <dt className="m-0 font-titulo text-[1.0625rem] text-ink">{termo.termo}</dt>
              <dd className="m-0 mt-1 max-w-[52ch] text-[0.9rem] leading-relaxed text-ink-2">
                {termo.frase}
              </dd>
            </div>
          ))}
        </dl>
      </BottomSheet>
    </>
  );
}
