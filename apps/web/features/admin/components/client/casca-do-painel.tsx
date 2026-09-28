"use client";

import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { adminVars } from "@/features/admin/lib/chrome-do-painel";
import {
  SidebarDoPainel,
  type EventoDaSidebar,
  type PerfilDoPainel,
} from "./sidebar-do-painel";
import { TopbarDoPainel } from "./topbar-do-painel";
import { BarraInferiorDoPainel } from "./barra-inferior-do-painel";

export function CascaDoPainel({
  evento,
  perfil,
  hoje,
  raiz,
  children,
}: {
  evento: EventoDaSidebar | null;
  perfil: PerfilDoPainel;
  hoje: string;
  raiz: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [aberta, setAberta] = useState(false);
  const fechar = useCallback(() => setAberta(false), []);

  useEffect(() => {
    if (!aberta) return;
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") fechar();
    };
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
  }, [aberta, fechar]);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[218px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)]">
      <SidebarDoPainel
        evento={evento}
        perfil={perfil}
        aberta={aberta}
        aoNavegar={fechar}
        aoTrocarEvento={() => {
          fechar();
          router.push("/admin");
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
          aoAbrirMenu={() => setAberta(true)}
        />
        <main
          id="main-content"
          className="mx-auto w-full max-w-[1540px] px-[17px] pb-[calc(100px+env(safe-area-inset-bottom))] pt-6 md:px-[clamp(24px,4vw,66px)] md:pb-[75px] md:pt-9"
        >
          {children}
        </main>
      </div>

      <BarraInferiorDoPainel eventoId={evento?.id ?? null} aoAbrirMenu={() => setAberta(true)} />
    </div>
  );
}
