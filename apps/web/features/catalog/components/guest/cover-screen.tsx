import React from "react";
import Link from "next/link";
import { resolvePackText, type Pack } from "@albora/packs";
import {
  cn,
  EventHero,
  FloatingButton,
  FloatingNav,
  Frame,
  GridIcon,
  MoreIcon,
  PersonIcon,
  ShareIcon,
  StackIcon,
  Star,
} from "@albora/ui-web";
import type { Background } from "@albora/tokens";
import { GuestBackground } from "@/features/catalog/lib/guest-background";

export type CoverScreenCounts = {
  fotos?: number;
  convidados?: number;
  interactionOpen?: boolean;
};

/** "—" quando o dado ainda não existe, nunca um número inventado. */
function formatCount(value: number | undefined): string {
  return value === undefined ? "—" : String(value);
}

function formatFeedStatus(interactionOpen: boolean | undefined): string {
  if (interactionOpen === undefined) return "—";
  return interactionOpen ? "ao vivo" : "em breve";
}

export function CoverScreen({
  pack,
  moments,
  background,
  fotoUrl,
  slug = "exemplo",
  counts,
}: {
  pack: Pack;
  moments: string[];
  background: Background;
  fotoUrl?: string;
  slug?: string;
  counts?: CoverScreenCounts;
}) {
  const base = `/e/${encodeURIComponent(slug)}`;
  const albuns = moments.slice(0, 5);
  const missoesRestantes = pack.missoes.length;

  const atalhos = [
    {
      rotulo: "Álbum",
      valor: formatCount(counts?.fotos),
      icone: <GridIcon size={20} />,
    },
    {
      rotulo: "Missões",
      valor: `${missoesRestantes} restantes`,
      icone: <Star size={20} />,
    },
    {
      rotulo: "Feed",
      valor: formatFeedStatus(counts?.interactionOpen),
      icone: <StackIcon size={20} />,
    },
    {
      rotulo: "Convidados",
      valor: formatCount(counts?.convidados),
      icone: <PersonIcon size={20} />,
    },
  ];

  return (
    <GuestBackground background={background} pack={pack}>
      <EventHero
        {...(fotoUrl ? { fotoUrl } : {})}
        titulo={resolvePackText(pack, "landing.exemplo.nome")}
        actions={
          <span className="flex gap-2">
            <FloatingButton>
              <ShareIcon size={19} />
            </FloatingButton>
            <FloatingButton>
              <MoreIcon />
            </FloatingButton>
          </span>
        }
      />

      <div className="grid grid-cols-4 gap-2 px-[1.125rem] pt-5 pb-[1.125rem]">
        {atalhos.map((a) => (
          <span
            key={a.rotulo}
            className="flex flex-col items-center gap-[0.3125rem] rounded-token bg-superficie px-1 py-3 text-ink-2"
          >
            {a.icone}
            <span className="text-[0.625rem] uppercase tracking-rotulo">{a.rotulo}</span>
            <span className="text-[0.6875rem] text-ink">{a.valor}</span>
          </span>
        ))}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-baseline justify-between px-[1.125rem] pb-3">
          <span className="font-titulo text-base">Álbuns da festa</span>
          <span className="text-[0.6875rem] text-ink-3">arraste</span>
        </div>

        <div className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-[1.125rem] pb-[calc(5.5rem+env(safe-area-inset-bottom))] [scrollbar-width:none]">
          {albuns.map((titulo, i) => {
            const central = i === 1;
            return (
              <span
                key={titulo}
                className={cn(
                  "relative aspect-[9/16] shrink-0 snap-center overflow-hidden rounded-token",
                  central ? "w-[9.25rem]" : "w-20 opacity-60",
                )}
              >
                <Frame atmosphere variant={i * 6 + 2} />
                <span className="absolute inset-0 bg-gradient-moment-scrim" />
                <span
                  className={cn(
                    "absolute inset-x-2.5 bottom-2.5 block font-titulo leading-tight tracking-titulo",
                    central ? "text-[0.9375rem]" : "text-[0.6875rem]",
                  )}
                >
                  {titulo}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <FloatingNav active="inicio" base={base} linkComponent={Link} />
    </GuestBackground>
  );
}
