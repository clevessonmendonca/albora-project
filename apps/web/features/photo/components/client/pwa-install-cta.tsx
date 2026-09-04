"use client";

import React, { useEffect } from "react";
import { SecondaryButton, ShareIcon } from "@albora/ui-web";
import {
  COPY_DISPENSAR_CTA,
  COPY_IOS_COMPARTILHAR,
  COPY_IOS_TELA_INICIO,
} from "@/features/photo/hooks/use-pwa-install";

export function PwaInstallCta({
  mostrar,
  promptNativo,
  precisaInstrucaoIos,
  onInstalar,
  onDispensar,
  onPromptIos,
}: {
  mostrar: boolean;
  promptNativo: boolean;
  precisaInstrucaoIos: boolean;
  onInstalar: () => void;
  onDispensar: () => void;
  onPromptIos: () => void;
}) {
  useEffect(() => {
    if (mostrar && precisaInstrucaoIos) onPromptIos();
  }, [mostrar, precisaInstrucaoIos, onPromptIos]);

  if (!mostrar) return null;

  return (
    <div>
      {promptNativo && (
        <SecondaryButton onClick={onInstalar}>Instalar na tela inicial</SecondaryButton>
      )}

      {precisaInstrucaoIos && !promptNativo && (
        <ol className="mb-3 ml-0 flex list-none flex-col gap-2.5 p-0">
          <li className="flex items-center gap-3 text-[0.88rem] leading-[1.5] text-ink-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-superficie border border-linha text-acento">
              <ShareIcon size={18} />
            </span>
            <span>
              <span className="mb-0.5 block font-titulo text-[0.62rem] font-normal uppercase tracking-[0.28em] text-acento-texto">
                1
              </span>
              {COPY_IOS_COMPARTILHAR}
            </span>
          </li>
          <li className="flex items-center gap-3 text-[0.88rem] leading-[1.5] text-ink-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-superficie border border-linha text-acento">
              <PlusHomeIcon />
            </span>
            <span>
              <span className="mb-0.5 block font-titulo text-[0.62rem] font-normal uppercase tracking-[0.28em] text-acento-texto">
                2
              </span>
              {COPY_IOS_TELA_INICIO}
            </span>
          </li>
        </ol>
      )}

      <button
        type="button"
        className="mt-2 min-h-11 border-0 bg-transparent p-0 text-left text-[0.85rem] leading-[1.5] text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink motion-reduce:transition-none"
        onClick={onDispensar}
      >
        {COPY_DISPENSAR_CTA}
      </button>
    </div>
  );
}

function PlusHomeIcon() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="4.5" y="4.5" width="15" height="15" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8.5v7M8.5 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
