"use client";

import type { ReactNode } from "react";
import { BackIcon } from "./icons";
import { cn } from "./variants";

export type EventHeroProps = {
  fotoUrl?: string;
  overline?: string;
  titulo: string;
  data?: string;
  onBack?: () => void;
  actions?: ReactNode;
};

export function EventHero({ fotoUrl, overline, titulo, data, onBack, actions }: EventHeroProps) {
  const hasTopRow = Boolean(onBack) || Boolean(actions);

  return (
    <div className="relative">
      <div className={cn("relative h-[20.5rem] shrink-0 overflow-hidden", !fotoUrl && "bg-superficie-alta")}>
        {fotoUrl && (
          <img
            src={fotoUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-veu-capa" />

        {hasTopRow && (
          <div className="absolute inset-x-[1.125rem] top-11 flex items-center justify-between">
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                aria-label="Voltar"
                className="grid size-9 place-items-center rounded-full bg-bg-vidro text-ink"
              >
                <BackIcon />
              </button>
            ) : (
              <span aria-hidden="true" />
            )}
            {actions ?? <span aria-hidden="true" />}
          </div>
        )}
      </div>

      <div className="relative -mt-13 px-6 text-center">
        {overline && (
          <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-2">{overline}</p>
        )}
        <h1
          className={cn(
            "font-titulo text-[clamp(1.75rem,8vw,2rem)] font-light leading-[1.1] tracking-titulo [text-wrap:balance]",
            overline && "mt-1.5",
          )}
        >
          {titulo}
        </h1>
        {data && <p className="mt-1.5 text-[0.8125rem] text-ink-2">{data}</p>}
      </div>
    </div>
  );
}
