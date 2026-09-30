"use client";

import { adminVars } from "@/features/admin/components/server/admin-shell";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BackIcon, LogoAlbora } from "@albora/ui-web";
import { GRUPOS_DE_DESTINO, destinoAtivo, destinoDe } from "@/features/admin/lib/navegacao";
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
/** Duas letras do nome do evento, para o bloco de identidade. "Ana & João" → "AJ". */
function iniciaisDoEvento(nome: string): string {
  const partes = nome.split(/\s*[&e]\s*|\s+/).filter((p) => /\p{L}/u.test(p));
  return partes.slice(0, 2).map((p) => p[0]!.toLocaleUpperCase("pt-BR")).join("") || "•";
}

/** Só a inicial da conta — o e-mail já aparece ao lado, inteiro. */
function iniciaisDoEmail(email: string): string {
  return (email.trim()[0] ?? "•").toLocaleUpperCase("pt-BR");
}

export function EventSidebar({
  eventId,
  name,
  countdown,
  email,
  plano,
  inicialRecolhida = false,
}: {
  eventId: string;
  name: string;
  countdown: string;
  email: string;
  plano: string;
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
      style={adminVars("dark")}
      className={[
        "sticky top-0 hidden h-dvh shrink-0 flex-col overflow-y-auto border-r border-linha bg-bg py-6 text-ink lg:flex",
        "transition-[width] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
        recolhida ? "w-[4.5rem] px-3" : "w-60 px-5",
      ].join(" ")}
    >
      <div className={recolhida ? "flex justify-center" : ""}>
        <LogoAlbora altura={26} className="shrink-0 text-ink" />
      </div>

      {!recolhida && (
        <div className="mt-7 flex items-center gap-3 rounded-token border border-linha px-3 py-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-token bg-superficie-alta font-titulo text-[0.8125rem] text-ink-2">
            {iniciaisDoEvento(name)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-titulo text-[0.95rem] leading-tight text-ink">{name}</span>
            {countdown && <span className="tipo-caption truncate text-ink-3">{countdown}</span>}
          </span>
        </div>
      )}

      <nav aria-label="Navegação do evento" className="mt-7 flex flex-col gap-5">
        {GRUPOS_DE_DESTINO.map((grupo) => (
          <div key={grupo.rotulo} className="flex flex-col gap-1">
            {!recolhida && (
              <span className="tipo-label px-3 pb-1 text-ink-3">{grupo.rotulo}</span>
            )}
            {grupo.destinos.map((id) => {
              const destino = destinoDe(id);
              if (!destino) return null;
              const Icon = ICONES_DE_DESTINO[destino.id];
              const href = `${base}${destino.suffix}`;
              const active = destinoAtivo(pathname, base) === destino.id;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={recolhida ? destino.rotulo : undefined}
                  title={recolhida ? destino.rotulo : undefined}
                  className={[
                    "flex min-h-12 items-center rounded-token no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
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
          </div>
        ))}
      </nav>

      {!recolhida && (
        <div className="mt-auto flex items-center gap-2.5 border-t border-linha pt-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-pilula bg-superficie-alta tipo-label text-ink-2">
            {iniciaisDoEmail(email)}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="tipo-caption truncate text-ink">{email}</span>
            <span className="tipo-label truncate text-ink-3">{plano}</span>
          </span>
        </div>
      )}

      <button
        type="button"
        onClick={alternar}
        aria-expanded={!recolhida}
        aria-label={recolhida ? "Expandir a navegação" : "Recolher a navegação"}
        className={[
          "flex min-h-12 cursor-pointer items-center rounded-token border-none bg-transparent text-ink-3",
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
