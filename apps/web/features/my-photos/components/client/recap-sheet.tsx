"use client";

import React, { useEffect } from "react";
import { ErrorMessage, PrimaryButton, ShareIcon } from "@albora/ui-web";
import type { QuadroDoRecap } from "@/features/my-photos/hooks/use-recap";

/** Só mostra quadros já compostos — não busca nem compõe nada; a orquestração fica em `use-recap`. */
export function RecapSheet({
  aberto,
  quadros,
  indiceAtivo,
  erro,
  compartilhando,
  refToken,
  onIr,
  onFechar,
  onCompartilhar,
}: {
  aberto: boolean;
  quadros: QuadroDoRecap[];
  indiceAtivo: number;
  erro: string | null;
  compartilhando: boolean;
  /** Ref de atribuição da festa (spec A1) — só existe pra mostrar o convite na tela final. */
  refToken?: string | null;
  onIr: (indice: number) => void;
  onFechar: () => void;
  onCompartilhar: () => void;
}) {
  useEffect(() => {
    if (!aberto) return;

    function tecla(ev: KeyboardEvent) {
      if (ev.key === "Escape") onFechar();
      else if (ev.key === "ArrowRight") onIr(indiceAtivo + 1);
      else if (ev.key === "ArrowLeft") onIr(indiceAtivo - 1);
    }

    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aberto, indiceAtivo, onFechar, onIr]);

  if (!aberto) return null;

  const atual = quadros[indiceAtivo];
  // Só na última tela do carrossel, depois de compartilhar — nunca em cada
  // foto individual, senão o convite viraria propaganda dentro da lembrança
  // (mesmo instinto do TP7 que bloqueia marca d'água na foto, spec A1 §4.1).
  const ultimaTela = quadros.length > 0 && indiceAtivo === quadros.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Recap da sua noite"
      className="fixed inset-0 z-20 grid grid-rows-[auto_1fr_auto] bg-bg font-corpo text-ink"
    >
      <header className="flex items-center justify-between gap-4 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <p className="m-0 font-titulo text-[0.7rem] uppercase tracking-[0.24em] text-ink-2">
          Recap{quadros.length > 0 ? ` · ${indiceAtivo + 1}/${quadros.length}` : ""}
        </p>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar recap"
          className="min-h-11 min-w-11 cursor-pointer rounded-pilula border border-linha bg-transparent px-4 text-[0.9rem] text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
        >
          Fechar
        </button>
      </header>

      <div className="relative flex items-center justify-center overflow-hidden px-4">
        {atual && (
          <img
            src={atual.url}
            alt={`Recap, foto ${indiceAtivo + 1} de ${quadros.length}`}
            className="max-h-full max-w-full rounded-token object-contain"
          />
        )}

        {quadros.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto anterior do recap"
              disabled={indiceAtivo === 0}
              onClick={() => onIr(indiceAtivo - 1)}
              className="absolute inset-y-0 left-0 w-1/4 cursor-pointer border-0 bg-transparent disabled:cursor-default"
            />
            <button
              type="button"
              aria-label="Próxima foto do recap"
              disabled={indiceAtivo >= quadros.length - 1}
              onClick={() => onIr(indiceAtivo + 1)}
              className="absolute inset-y-0 right-0 w-1/4 cursor-pointer border-0 bg-transparent disabled:cursor-default"
            />
          </>
        )}
      </div>

      <footer className="grid gap-3 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {erro && <ErrorMessage>{erro}</ErrorMessage>}
        <PrimaryButton disabled={compartilhando || quadros.length === 0} onClick={onCompartilhar}>
          <span className="inline-flex items-center justify-center gap-2">
            <ShareIcon size={18} />
            {compartilhando ? "Preparando…" : "Compartilhar recap"}
          </span>
        </PrimaryButton>

        {ultimaTela && refToken && (
          <p className="m-0 text-center text-[0.8rem] leading-normal text-ink-2">
            Curtiu o álbum? Depois da sua festa você também pode ter um.{" "}
            <a href={`/?ref=${encodeURIComponent(refToken)}`} className="text-ink underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70">
              Conhecer a Albora
            </a>
          </p>
        )}
      </footer>
    </div>
  );
}
