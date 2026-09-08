"use client";

import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Actor } from "@albora/core";
import { Star } from "@albora/ui-web";
import { ConsoleNav, type ConsoleNavCounts } from "@/features/console/components/server/console-nav";
import { MenuIcon, RecolherIcon } from "@/features/console/components/server/console-icons";
import { ConsoleProfileMenu } from "@/features/console/components/client/console-profile-menu";
import { ConsoleSearch } from "@/features/console/components/client/console-search";

export const CHAVE_SIDEBAR = "albora-console-sidebar";

/** `localStorage` some em janela privativa e lança em navegador que bloqueia site data. */
export function lerPreferenciaRecolhida(storage: Pick<Storage, "getItem"> | undefined): boolean {
  try {
    return storage?.getItem(CHAVE_SIDEBAR) === "recolhida";
  } catch {
    return false;
  }
}

function Marca({ recolhida }: { recolhida: boolean }) {
  return (
    <span className="flex items-center gap-2 px-1">
      <Star size={22} filled />
      {!recolhida && (
        <>
          <span className="font-[family-name:var(--fonte-titulo)] text-[1.05rem] leading-none text-ink">Álbora</span>
          <span className="font-[family-name:var(--fonte-titulo)] text-[0.68rem] uppercase tracking-[0.16em] text-ink-3">Console</span>
        </>
      )}
    </span>
  );
}

/**
 * Moldura do console: canvas claro com o painel flutuante do protótipo v5.
 * Tema claro é fixo aqui — o console nunca se repinta com a identidade do
 * casal (CLAUDE.md §Identidade visual), então não há alternância de tema.
 *
 * A largura da barra é escolha do operador, não da largura da janela: a
 * preferência mora em `localStorage` e o rail só-ícone é o estado recolhido,
 * não um breakpoint. Abaixo de 900px a barra vira gaveta com pano de fundo.
 */
export function ConsoleFrame({
  actor,
  counts,
  periodo,
  children,
}: {
  actor: Actor;
  counts?: ConsoleNavCounts | undefined;
  periodo?: ReactNode;
  children: ReactNode;
}) {
  const [recolhida, setRecolhida] = useState(false);
  const [gaveta, setGaveta] = useState(false);

  useEffect(() => {
    setRecolhida(lerPreferenciaRecolhida(globalThis.localStorage));
  }, []);

  const alternarRecolhida = useCallback(() => {
    setRecolhida((atual) => {
      const proxima = !atual;
      try {
        globalThis.localStorage?.setItem(CHAVE_SIDEBAR, proxima ? "recolhida" : "expandida");
      } catch {
        /* preferência de largura não vale derrubar a tela */
      }
      return proxima;
    });
  }, []);

  useEffect(() => {
    if (!gaveta) return;
    function aoTeclar(ev: KeyboardEvent) {
      if (ev.key === "Escape") setGaveta(false);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [gaveta]);

  return (
    <div className="min-h-dvh bg-bg p-0 min-[900px]:p-[1.125rem]">
      <div className="mx-auto flex min-h-dvh w-full max-w-[94rem] overflow-hidden bg-superficie min-[900px]:min-h-[calc(100dvh-2.25rem)] min-[900px]:rounded-media min-[900px]:elev-2">
        {gaveta && (
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={() => setGaveta(false)}
            className="fixed inset-0 z-40 border-none bg-ink/40 p-0 min-[900px]:hidden"
          />
        )}

        <aside
          aria-label="Navegação principal"
          className={[
            "flex shrink-0 flex-col gap-5 overflow-y-auto border-r border-linha bg-superficie p-3",
            "max-[899px]:fixed max-[899px]:inset-y-0 max-[899px]:left-0 max-[899px]:z-50 max-[899px]:w-64 max-[899px]:transition-transform max-[899px]:duration-[var(--tempo)] max-[899px]:ease-[var(--curva)]",
            gaveta ? "max-[899px]:translate-x-0" : "max-[899px]:-translate-x-full",
            recolhida ? "min-[900px]:w-[4.75rem]" : "min-[900px]:w-60",
          ].join(" ")}
        >
          <div className="flex min-h-11 items-center px-1">
            <Marca recolhida={recolhida} />
          </div>

          <ConsoleNav actor={actor} counts={counts} recolhida={recolhida} onNavigate={() => setGaveta(false)} />

          <div className="mt-auto">
            <ConsoleProfileMenu actor={actor} recolhida={recolhida} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-3 border-b border-linha bg-superficie px-4 py-2">
            <button
              type="button"
              onClick={() => setGaveta(true)}
              aria-expanded={gaveta}
              aria-label="Abrir menu"
              className="flex h-11 w-11 items-center justify-center rounded-superficie border border-linha bg-superficie text-ink min-[900px]:hidden"
            >
              <MenuIcon size={20} />
            </button>

            <button
              type="button"
              onClick={alternarRecolhida}
              aria-pressed={recolhida}
              aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
              title={recolhida ? "Expandir menu" : "Recolher menu"}
              className="hidden h-11 w-11 items-center justify-center rounded-superficie border border-linha bg-superficie text-ink-2 transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:text-ink min-[900px]:flex"
            >
              <RecolherIcon size={18} />
            </button>

            <ConsoleSearch />
            {periodo ? <div className="ml-auto">{periodo}</div> : null}
          </header>

          <main className="flex-1 overflow-y-auto p-[clamp(1.25rem,3vw,2.75rem)]">{children}</main>
        </div>
      </div>
    </div>
  );
}
