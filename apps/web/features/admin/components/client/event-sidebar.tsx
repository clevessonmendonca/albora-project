"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackIcon, LogoAlbora } from "@albora/ui-web";
import { DESTINOS, destinoAtivo } from "@/features/admin/lib/navegacao";
import { ICONES_DE_DESTINO } from "@/features/admin/components/client/icones-de-destino";
import { cookieDoRail } from "@/features/admin/lib/sidebar-recolhida";

/**
 * Rail lateral do painel a partir de 1024px (abaixo disso o `AppNav` assume).
 * Superfície clara, editorial: logo, identidade do evento e os seis destinos.
 * A conta e a saída moram no menu do cabeçalho — sair não é destino de
 * navegação.
 *
 * Recolhe para ícones. Eram 240px fixos que começavam em 640px: num tablet de
 * 768px em retrato o rail comia 31% da largura útil, e o conteúdo do painel é
 * denso — álbum, fila de moderação, lista de convidados. Por isso ele agora só
 * aparece em 1024px, e mesmo ali quem trabalha decide se quer o rótulo.
 */
export function EventSidebar({
  eventId,
  name,
  countdown,
  inicialRecolhida = false,
}: {
  eventId: string;
  name: string;
  countdown: string;
  inicialRecolhida?: boolean;
}) {
  const pathname = usePathname();
  const base = `/admin/e/${eventId}`;
  const [recolhida, setRecolhida] = useState(inicialRecolhida);

  function alternar() {
    const proxima = !recolhida;
    setRecolhida(proxima);
    document.cookie = cookieDoRail(proxima);
  }

  return (
    <aside
      className={[
        "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-linha py-6 lg:flex",
        "transition-[width] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
        recolhida ? "w-[4.5rem] px-3" : "w-60 px-5",
      ].join(" ")}
    >
      <div className={recolhida ? "flex justify-center" : ""}>
        <LogoAlbora altura={26} className="shrink-0 text-ink" />
      </div>

      {!recolhida && (
        <div className="mt-7 flex flex-col gap-0.5">
          <span className="font-titulo text-[0.95rem] leading-tight text-ink">{name}</span>
          {countdown && <span className="tipo-caption text-ink-3">{countdown}</span>}
        </div>
      )}

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
              title={recolhida ? destino.rotulo : undefined}
              className={[
                "flex min-h-11 items-center rounded-token no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
                recolhida ? "justify-center px-0" : "gap-3 px-3",
                active
                  ? "bg-superficie-alta text-acento-texto"
                  : "text-ink-2 hover:bg-superficie-alta hover:text-ink",
              ].join(" ")}
            >
              <Icon size={20} />
              {!recolhida && <span className="tipo-label leading-none">{destino.rotulo}</span>}
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={alternar}
        aria-expanded={!recolhida}
        aria-label={recolhida ? "Expandir a navegação" : "Recolher a navegação"}
        className={[
          "mt-auto flex min-h-11 cursor-pointer items-center rounded-token border-none bg-transparent text-ink-3",
          "transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta hover:text-ink",
          recolhida ? "justify-center px-0" : "gap-3 px-3",
        ].join(" ")}
      >
        <span className={recolhida ? "rotate-180" : ""}>
          <BackIcon size={18} />
        </span>
        {!recolhida && <span className="tipo-label leading-none">Recolher</span>}
      </button>
    </aside>
  );
}
