"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BottomSheet, MoreIcon } from "@albora/ui-web";
import { DESTINOS, destinoAtivo, type DestinoId } from "@/features/admin/lib/navegacao";
import { ICONES_DE_DESTINO } from "./icones-de-destino";

const PRINCIPAIS: readonly DestinoId[] = ["inicio", "ao-vivo", "fotos", "convidados"];
const itemClass = "flex min-h-14 min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 py-2 text-xs no-underline transition-colors hover:text-acento-texto";

/** Quatro destinos frequentes; o restante cabe numa folha acessível do DS. */
export function AppNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const [aberto, setAberto] = useState(false);
  const base = `/admin/e/${eventId}`;
  const ativo = destinoAtivo(pathname, base);
  const secundarios = DESTINOS.filter((d) => !PRINCIPAIS.includes(d.id));
  return (
    <>
      <nav aria-label="Navegação do evento" className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto flex max-w-xl items-stretch">
          {PRINCIPAIS.map((id) => {
            const destino = DESTINOS.find((d) => d.id === id)!;
            const Icon = ICONES_DE_DESTINO[id];
            return <Link key={id} href={`${base}${destino.suffix}`} aria-current={ativo === id ? "page" : undefined} className={`${itemClass} ${ativo === id ? "text-acento-texto" : "text-ink-2"}`}><Icon size={22} /><span>{destino.rotulo}</span></Link>;
          })}
          <button type="button" aria-haspopup="dialog" aria-expanded={aberto} onClick={() => setAberto(true)} className={`${itemClass} border-0 bg-transparent ${secundarios.some((d) => d.id === ativo) ? "text-acento-texto" : "text-ink-2"}`}><MoreIcon size={22} /><span>Mais</span></button>
        </div>
      </nav>
      <BottomSheet title="Mais do evento" titleId="event-navigation-title" open={aberto} onClose={() => setAberto(false)}>
        <nav aria-label="Outras áreas do evento" className="grid gap-2">
          {secundarios.map((destino) => {
            const Icon = ICONES_DE_DESTINO[destino.id];
            return <Link key={destino.id} href={`${base}${destino.suffix}`} onClick={() => setAberto(false)} aria-current={ativo === destino.id ? "page" : undefined} className="flex min-h-12 items-center gap-3 rounded-token px-3 text-ink no-underline hover:bg-superficie-alta"><Icon size={22} />{destino.rotulo}</Link>;
          })}
        </nav>
      </BottomSheet>
    </>
  );
}
