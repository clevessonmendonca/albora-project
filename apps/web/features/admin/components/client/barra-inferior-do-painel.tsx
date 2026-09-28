"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import {
  DESTINOS,
  DESTINOS_MOBILE,
  destinoAtivo,
  hrefDoDestino,
} from "@/features/admin/lib/navegacao";
import { ICONES_DA_NAVEGACAO } from "@/features/admin/lib/icones-da-navegacao";
import { useModerationCount } from "./moderation-count-context";

/** Quatro destinos + "Mais". "Mais" abre a gaveta com o menu inteiro — não é um destino. */
export function BarraInferiorDoPainel({
  eventoId,
  gavetaAberta,
  aoAbrirMenu,
}: {
  eventoId: string | null;
  gavetaAberta: boolean;
  aoAbrirMenu: () => void;
}) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const base = eventoId ? `/admin/e/${eventoId}` : "/admin";
  const ativo = destinoAtivo(pathname, base);

  const classes = (marcado: boolean) =>
    [
      "flex min-w-[58px] flex-col items-center justify-center gap-[3px] border-0 bg-transparent text-[10px] no-underline",
      "transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
      marcado ? "text-acento-texto" : "text-ink-2",
    ].join(" ");

  return (
    <nav
      aria-label="Navegação do evento"
      data-admin-nav
      className="fixed inset-x-0 bottom-0 z-20 flex h-[calc(66px+env(safe-area-inset-bottom))] justify-around border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {DESTINOS_MOBILE.map((id) => {
        const destino = DESTINOS.find((d) => d.id === id);
        if (!destino) return null;
        const Icone = ICONES_DA_NAVEGACAO[destino.id];
        const marcado = ativo === destino.id;
        const pendencia = destino.id === "album" && count > 0;

        return (
          <Link
            key={destino.id}
            href={hrefDoDestino(destino, base)}
            aria-current={marcado ? "page" : undefined}
            className={classes(marcado)}
          >
            <span className="relative">
              <Icone size={19} aria-hidden />
              {pendencia && (
                <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-critico px-1 text-[0.5rem] leading-none text-sobre-acento">
                  {count > 9 ? "9+" : count}
                </span>
              )}
            </span>
            <span className="max-w-full truncate">{destino.rotulo}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={aoAbrirMenu}
        aria-haspopup="menu"
        aria-expanded={gavetaAberta}
        aria-controls="sidebar-do-painel"
        className={`${classes(false)} cursor-pointer`}
      >
        <Menu size={19} aria-hidden />
        <span>Mais</span>
      </button>
    </nav>
  );
}
