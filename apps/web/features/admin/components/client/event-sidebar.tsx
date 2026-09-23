"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Images,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Share2,
  Sparkles,
  Users,
} from "lucide-react";
import { DESTINOS, destinoAtivo, type DestinoId } from "@/features/admin/lib/navegacao";
import { useModerationCount } from "./moderation-count-context";

const ICONES: Record<DestinoId, typeof Home> = {
  inicio: Home,
  fotos: Images,
  convidados: Users,
  experiencia: Sparkles,
  compartilhar: Share2,
  ajustes: Settings2,
};

const CHAVE_RECOLHIDA = "albora.admin.sidebar.recolhida";

export function EventSidebar({
  eventId,
  nomeDoEvento,
}: {
  eventId: string;
  nomeDoEvento: string;
}) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const base = `/admin/e/${eventId}`;
  const ativo = destinoAtivo(pathname, base);
  const [recolhida, setRecolhida] = useState(false);

  useEffect(() => {
    try {
      setRecolhida(window.localStorage.getItem(CHAVE_RECOLHIDA) === "1");
    } catch {
      setRecolhida(false);
    }
  }, []);

  const alternar = () => {
    setRecolhida((antes) => {
      const agora = !antes;
      try {
        window.localStorage.setItem(CHAVE_RECOLHIDA, agora ? "1" : "0");
      } catch {
        /* Modo privado: a preferência não sobrevive, a navegação continua. */
      }
      return agora;
    });
  };

  const Recolher = recolhida ? PanelLeftOpen : PanelLeftClose;

  return (
    <nav
      aria-label="Seções do evento"
      data-admin-nav
      className={[
        "sticky top-0 hidden h-dvh shrink-0 flex-col gap-1 border-r border-linha bg-superficie px-3 py-6 lg:flex",
        recolhida ? "w-[4.5rem]" : "w-64",
      ].join(" ")}
    >
      <p
        title={nomeDoEvento}
        className={[
          "tipo-caption mb-4 px-2 text-ink-3",
          recolhida ? "sr-only" : "truncate",
        ].join(" ")}
      >
        {nomeDoEvento}
      </p>

      {DESTINOS.map((destino) => {
        const Icone = ICONES[destino.id];
        const href = `${base}${destino.suffix}`;
        const marcado = ativo === destino.id;
        const pendencia = destino.id === "fotos" && count > 0;

        return (
          <Link
            key={destino.id}
            href={href}
            aria-current={marcado ? "page" : undefined}
            title={recolhida ? destino.rotulo : undefined}
            className={[
              "relative flex min-h-11 items-center gap-3 rounded-pilula px-3 text-sm no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
              marcado
                ? "bg-superficie-alta font-titulo text-acento-texto"
                : "text-ink-2 hover:bg-superficie-alta hover:text-ink",
              recolhida ? "justify-center" : "",
            ].join(" ")}
          >
            <Icone size={18} aria-hidden />
            <span className={recolhida ? "sr-only" : "truncate"}>{destino.rotulo}</span>
            {pendencia && (
              <span
                className={[
                  "flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-critico px-1 font-titulo text-[0.55rem] leading-none text-sobre-acento",
                  recolhida ? "absolute right-1 top-1" : "ml-auto",
                ].join(" ")}
              >
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
        );
      })}

      <button
        type="button"
        onClick={alternar}
        aria-expanded={!recolhida}
        className="mt-auto flex min-h-11 cursor-pointer items-center gap-3 rounded-pilula border-none bg-transparent px-3 text-sm text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink"
      >
        <Recolher size={18} aria-hidden />
        <span className={recolhida ? "sr-only" : ""}>
          {recolhida ? "Expandir menu" : "Recolher menu"}
        </span>
      </button>
    </nav>
  );
}
