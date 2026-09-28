"use client";

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { adminVars } from "@/features/admin/lib/chrome-do-painel";
import {
  SidebarDoPainel,
  type EventoDaSidebar,
  type PerfilDoPainel,
} from "./sidebar-do-painel";
import { TopbarDoPainel } from "./topbar-do-painel";
import { BarraInferiorDoPainel } from "./barra-inferior-do-painel";
import { SeletorDeEvento } from "./seletor-de-evento";

export function CascaDoPainel({
  evento,
  eventos = [],
  perfil,
  hoje,
  raiz,
  children,
}: {
  evento: EventoDaSidebar | null;
  /** Os eventos da conta, para o seletor. Vazio fora do escopo de evento. */
  eventos?: readonly EventoDaSidebar[];
  perfil: PerfilDoPainel;
  hoje: string;
  raiz: string;
  children: ReactNode;
}) {
  const [aberta, setAberta] = useState(false);
  const [seletorAberto, setSeletorAberto] = useState(false);
  const quemAbriu = useRef<HTMLElement | null>(null);

  const abrir = useCallback(() => {
    quemAbriu.current = document.activeElement as HTMLElement | null;
    setAberta(true);
  }, []);
  const fechar = useCallback(() => setAberta(false), []);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, fechar]);

  /**
   * Gaveta sem gestão de foco deixa quem navega por teclado preso atrás dela:
   * o Tab continua correndo no conteúdo escondido. Ao abrir o foco entra; ao
   * fechar volta para quem abriu, senão ele cai no começo da página.
   */
  useEffect(() => {
    const gaveta = document.getElementById("sidebar-do-painel");
    if (aberta) {
      gaveta?.querySelector<HTMLElement>("a, button")?.focus();
      return;
    }
    quemAbriu.current?.focus();
    quemAbriu.current = null;
  }, [aberta]);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[218px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
      <SidebarDoPainel
        evento={evento}
        perfil={perfil}
        aberta={aberta}
        aoNavegar={fechar}
        aoTrocarEvento={() => {
          fechar();
          setSeletorAberto(true);
        }}
      />

      {aberta && (
        <div
          onClick={fechar}
          aria-hidden
          // O véu é escuro nos dois temas: escurecer com a var do tema claro não escurece nada.
          style={adminVars("dark")}
          className="fixed inset-0 z-[25] bg-bg-overlay-medio md:hidden"
        />
      )}

      <div className="flex min-w-0 flex-col">
        <TopbarDoPainel
          eventoId={evento?.id ?? null}
          raiz={raiz}
          hoje={hoje}
          gavetaAberta={aberta}
          aoAbrirMenu={abrir}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1540px] px-[17px] pb-[calc(100px+env(safe-area-inset-bottom))] pt-6 md:px-[clamp(24px,4vw,66px)] md:pb-[75px] md:pt-9"
        >
          {children}
        </main>
      </div>

      <SeletorDeEvento
        eventos={eventos}
        ativoId={evento?.id ?? null}
        aberto={seletorAberto}
        aoFechar={() => setSeletorAberto(false)}
      />

      <BarraInferiorDoPainel
        eventoId={evento?.id ?? null}
        gavetaAberta={aberta}
        aoAbrirMenu={abrir}
      />
    </div>
  );
}
