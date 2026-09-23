"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DESTINOS, destinoAtivo } from "@/features/admin/lib/navegacao";
import { ICONES_DE_DESTINO } from "@/features/admin/components/client/icones-de-destino";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";


/** Rail lateral do painel no desktop (o mobile usa a bottom-bar de `AppNav`). Superfície clara,
 *  editorial: logo, identidade do evento, as 4 abas e a saída — o app inteiro parte daqui. */
export function EventSidebar({
  eventId,
  name,
  countdown,
}: {
  eventId: string;
  name: string;
  countdown: string;
}) {
  const pathname = usePathname();
  const base = `/admin/e/${eventId}`;

  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-linha px-5 py-6 sm:flex">
      <span className="tipo-title m-0 text-[1.35rem] leading-none">Álbora</span>

      <div className="mt-7 flex flex-col gap-0.5">
        <span className="font-titulo text-[0.95rem] leading-tight text-ink">{name}</span>
        {countdown && <span className="tipo-caption text-ink-3">{countdown}</span>}
      </div>

      <nav aria-label="Navegação do evento" className="mt-7 flex flex-col gap-1">
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
                "flex min-h-11 items-center gap-3 rounded-token px-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
                active
                  ? "bg-superficie-alta text-acento-texto"
                  : "text-ink-2 hover:bg-superficie-alta hover:text-ink",
              ].join(" ")}
            >
              <Icon size={20} />
              <span className="tipo-label leading-none">{destino.rotulo}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <SignOutButton />
      </div>
    </aside>
  );
}
