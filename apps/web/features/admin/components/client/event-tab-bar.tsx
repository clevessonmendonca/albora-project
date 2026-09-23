"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomSheet } from "@albora/ui-web";
import { Home, Images, MoreHorizontal, Settings2, Share2, Sparkles, Users } from "lucide-react";
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

const DIRETOS: readonly DestinoId[] = ["inicio", "fotos", "convidados", "experiencia"];

export function EventTabBar({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const [aberto, setAberto] = useState(false);
  const base = `/admin/e/${eventId}`;
  const ativo = destinoAtivo(pathname, base);

  const diretos = DESTINOS.filter((d) => DIRETOS.includes(d.id));
  const noMais = DESTINOS.filter((d) => !DIRETOS.includes(d.id));
  const maisMarcado = noMais.some((d) => d.id === ativo);

  const itemClasses = (marcado: boolean) =>
    [
      "flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-superficie px-1 py-1.5 text-[0.65rem] no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
      marcado ? "font-titulo text-acento-texto" : "text-ink-3",
    ].join(" ");

  return (
    <>
      <nav
        aria-label="Navegação do evento"
        data-admin-nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch gap-0.5 border-t border-linha bg-superficie px-2 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden"
      >
        {diretos.map((destino) => {
          const Icone = ICONES[destino.id];
          const marcado = ativo === destino.id;
          const pendencia = destino.id === "fotos" && count > 0;

          return (
            <Link
              key={destino.id}
              href={`${base}${destino.suffix}`}
              aria-current={marcado ? "page" : undefined}
              className={itemClasses(marcado)}
            >
              <span className="relative">
                <Icone size={20} aria-hidden />
                {pendencia && (
                  <span className="absolute -right-2 -top-1 flex h-3.5 min-w-[0.875rem] items-center justify-center rounded-full bg-critico px-1 font-titulo text-[0.5rem] leading-none text-sobre-acento">
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
          onClick={() => setAberto(true)}
          aria-current={maisMarcado ? "page" : undefined}
          aria-haspopup="dialog"
          className={`${itemClasses(maisMarcado)} cursor-pointer border-none bg-transparent`}
        >
          <MoreHorizontal size={20} aria-hidden />
          <span>Mais</span>
        </button>
      </nav>

      <BottomSheet title="Mais do evento" open={aberto} onClose={() => setAberto(false)}>
        <div className="flex flex-col gap-1 pb-2">
          {noMais.map((destino) => {
            const Icone = ICONES[destino.id];

            return (
              <Link
                key={destino.id}
                href={`${base}${destino.suffix}`}
                onClick={() => setAberto(false)}
                aria-current={ativo === destino.id ? "page" : undefined}
                className="flex min-h-11 items-center gap-3 rounded-pilula px-3 text-sm text-ink no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta"
              >
                <Icone size={18} aria-hidden />
                {destino.rotulo}
              </Link>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
