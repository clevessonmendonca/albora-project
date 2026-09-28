"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINOS, destinoAtivo } from "@/features/admin/lib/navegacao";
import { ICONES_DE_DESTINO } from "@/features/admin/components/client/icones-de-destino";


/** Bottom-bar do painel até 1024px — mobile e tablet (acima disso o `EventSidebar` assume).
 *  Fixa, alvos táteis grandes. No tablet ela ganha do rail: 240px fixos comiam 31% de uma tela de 768px. */
export function AppNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/e/${eventId}`;

  return (
    <nav
      aria-label="Navegação do evento"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-superficie lg:hidden"
    >
      <div className="flex items-stretch justify-around">
        {DESTINOS.map((destino) => {
          const Icon = ICONES_DE_DESTINO[destino.id];
          const href = `${base}${destino.suffix}`;
          const active = destinoAtivo(pathname, base) === destino.id;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)]",
                active ? "text-acento-texto" : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              <Icon size={22} />
              <span className="tipo-label leading-none">{destino.rotulo}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
