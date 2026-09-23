"use client";

import React from "react";
import { showToast } from "@albora/ui-web";

export function EventLink({ title, url }: { title: string; url: string }) {
  const copiar = () => {
    void navigator.clipboard
      .writeText(url)
      .then(() => showToast(`${title} copiado`, "success"))
      .catch(() => showToast("Não deu para copiar. Selecione o link e copie à mão.", "error"));
  };

  return (
    <div>
      <span className="tipo-label block text-ink-3">{title}</span>
      <div className="mt-1 flex items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="tipo-caption min-w-0 flex-1 truncate text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80"
        >
          {url}
        </a>
        <button
          type="button"
          onClick={copiar}
          className="tipo-label inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-1 rounded-pilula border border-linha bg-superficie-alta px-3 text-ink transition-[transform,border-color,color] duration-instantaneo ease-mola hover:border-acento-texto hover:text-ink-2 active:scale-[0.97]"
        >
          Copiar
        </button>
      </div>
    </div>
  );
}
