"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { DESTINOS, destinoAtivo } from "@/features/admin/lib/navegacao";
import { TemaDoPainelToggle } from "./tema-do-painel-toggle";
import { SignOutButton } from "./sign-out-button";

export function TopbarDoPainel({
  eventoId,
  raiz,
  hoje,
  aoAbrirMenu,
}: {
  eventoId: string;
  /** O primeiro nível da trilha — o nome curto do espaço do anfitrião. */
  raiz: string;
  /** Data já formatada no servidor: formatar no cliente diverge entre render e hidratação. */
  hoje: string;
  aoAbrirMenu: () => void;
}) {
  const pathname = usePathname();
  const ativo = destinoAtivo(pathname, `/admin/e/${eventoId}`);
  const secao = DESTINOS.find((d) => d.id === ativo)?.rotulo ?? "Visão geral";

  return (
    <header className="flex h-16 items-center justify-between gap-5 border-b border-linha bg-superficie px-[18px] md:h-[76px] md:px-[clamp(24px,4vw,66px)]">
      <div className="flex items-center gap-[13px]">
        <button
          type="button"
          onClick={aoAbrirMenu}
          aria-label="Abrir menu"
          aria-controls="sidebar-do-painel"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-linha bg-superficie text-ink-2 md:hidden"
        >
          <Menu size={18} aria-hidden />
        </button>
        <nav aria-label="Trilha" className="flex items-center gap-[9px] text-[13px] text-ink-3">
          {raiz}
          <span aria-hidden>›</span>
          <b className="font-semibold text-ink">{secao}</b>
        </nav>
      </div>

      <div className="flex items-center gap-[15px]">
        <span className="hidden text-[12px] text-ink-3 md:inline">{hoje}</span>
        <TemaDoPainelToggle />
        <button
          type="button"
          title="Notificações"
          aria-label="Notificações"
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full border border-linha bg-superficie text-ink-2"
        >
          <Bell size={17} aria-hidden />
        </button>
        <SignOutButton />
      </div>
    </header>
  );
}
