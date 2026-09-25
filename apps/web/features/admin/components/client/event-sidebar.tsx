"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoAlbora } from "@albora/ui-web";
import { DESTINOS, destinoAtivo } from "@/features/admin/lib/navegacao";
import { ICONES_DE_DESTINO } from "@/features/admin/components/client/icones-de-destino";


/** Rail lateral do painel no desktop (o mobile usa a bottom-bar de `AppNav`). Superfície clara,
 *  editorial: logo, identidade do evento e os seis destinos. A conta e a saída moram
 *  no menu do cabeçalho, não aqui — sair não é destino de navegação. */
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
      <LogoAlbora altura={26} className="shrink-0 text-ink" />

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

    </aside>
  );
}
