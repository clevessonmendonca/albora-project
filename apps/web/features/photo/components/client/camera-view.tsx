"use client";

import React, { type ReactNode } from "react";
import { Badge, GuestShell, MissionBanner, SkipLink } from "@albora/ui-web";

/** Visor decorativo — captura sai da câmera nativa (ver `photo-page.tsx`). `onBack` obrigatório: tela sem saída no caminho crítico foi bug reportado. */
export function CameraView({
  eventTitle,
  headerAction,
  mission,
  places,
  activePlaceId,
  onPlace,
  recentThumbs,
  processing,
  onShutter,
  onRoll,
  onBack,
  footer,
}: {
  eventTitle: string;
  headerAction?: ReactNode;
  mission?: { index: number; total: number; title: string } | null;
  places: readonly { id: string; title: string }[];
  activePlaceId: string | null;
  onPlace: (id: string | null) => void;
  recentThumbs: readonly string[];
  processing: boolean;
  onShutter: () => void;
  onRoll: () => void;
  onBack: () => void;
  footer?: ReactNode;
}) {
  return (
    <GuestShell hideStatusBar>
      <SkipLink />
      <div id="main-content" className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-superficie bg-superficie-vignette">
        <div className="relative z-[3] grid grid-cols-[auto_1fr_auto] items-center gap-2 px-3 pb-2 pt-[calc(0.625rem+env(safe-area-inset-top))]">
          <BackButton onClick={onBack} />
          <span className="min-w-0 truncate text-center font-titulo text-[0.9375rem] tracking-titulo text-ink">
            {eventTitle}
          </span>
          <span className="flex justify-end">{headerAction}</span>
        </div>

        <div className="relative min-h-0 flex-1 px-4 pb-2">
          {mission && (
            <div className="banner-missao absolute inset-x-0 top-2 z-[1]">
              <MissionBanner
                index={mission.index}
                total={mission.total}
                title={mission.title}
              />
            </div>
          )}

          {places.length > 0 && (
            <div className="absolute inset-x-0 bottom-3 z-[1] flex flex-wrap gap-2">
              {places.slice(0, 4).map((place) => (
                <PlaceToggle
                  key={place.id}
                  active={activePlaceId === place.id}
                  onClick={() => onPlace(activePlaceId === place.id ? null : place.id)}
                >
                  {place.title}
                </PlaceToggle>
              ))}
            </div>
          )}
        </div>

        <ShutterControls
          recentThumbs={recentThumbs}
          processing={processing}
          onShutter={onShutter}
          onRoll={onRoll}
        />

        {footer ? (
          <div className="relative z-[2] px-[1.125rem] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
      <style>{ESTILO_VISOR}</style>
    </GuestShell>
  );
}

/** Entrada sutil da missão: um corte instantâneo compete pela atenção que a foto merece — um fade+subida na curva-base (nunca a mola, reservada a toque) some no "não intrusivo" do brief. */
const ESTILO_VISOR = `
@keyframes visor-missao-entrar {
  from { opacity: 0; transform: translateY(-0.5rem); }
  to   { opacity: 1; transform: none; }
}
.banner-missao { animation: visor-missao-entrar var(--tempo-lento) var(--curva) both; }

@media (prefers-reduced-motion: reduce) {
  .banner-missao { animation: none; }
}
`;

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={onClick}
      className="grid size-[3.375rem] shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-noite-vidro text-ink transition-transform duration-instantaneo ease-mola active:scale-90 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M15 5L8 12L15 19"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function PlaceToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] transition-transform duration-instantaneo ease-mola active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
    >
      <Badge tone={active ? "accent" : "neutral"}>{children}</Badge>
    </button>
  );
}

function ShutterControls({
  recentThumbs,
  processing,
  onShutter,
  onRoll,
}: {
  recentThumbs: readonly string[];
  processing: boolean;
  onShutter: () => void;
  onRoll: () => void;
}) {
  return (
    <div className="relative z-[2] grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-6 pt-4 pb-3">
      <button
        type="button"
        aria-label="Abrir rolo de fotos"
        onClick={onRoll}
        disabled={processing}
        className="grid size-[3.375rem] shrink-0 place-items-center justify-self-start overflow-hidden rounded-[calc(var(--raio)*0.75)] border border-linha bg-superficie-alta transition-transform duration-instantaneo ease-mola disabled:cursor-default disabled:opacity-40 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <RecentPreview thumbs={recentThumbs} />
      </button>

      {/* Disparo: alvo ≥64px (4.5rem = 72px), mola em duas camadas — anel recua, íris interna fecha um pouco mais — pra ler como clique físico, não só um botão que encolhe. */}
      <button
        type="button"
        aria-label="Fotografar"
        disabled={processing}
        onClick={onShutter}
        className="group grid size-[4.5rem] place-items-center justify-self-center rounded-full border-[3px] border-ink bg-transparent transition-transform duration-instantaneo ease-mola disabled:cursor-default disabled:opacity-40 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <span className="size-[3.625rem] rounded-full bg-acento transition-transform duration-instantaneo ease-mola group-active:scale-90 motion-reduce:transition-none motion-reduce:group-active:scale-100" />
      </button>

      <span aria-hidden="true" className="size-[3.375rem]" />
    </div>
  );
}

function RecentPreview({ thumbs }: { thumbs: readonly string[] }) {
  const ultima = thumbs[0];

  if (!ultima) {
    return (
      <span className="font-titulo text-[0.5625rem] uppercase leading-tight tracking-rotulo text-ink-2">
        Rolo
      </span>
    );
  }

  return (
    <img src={ultima} alt="" className="block size-full object-cover" />
  );
}

export function QueueLabel({ pending }: { pending: number }) {
  if (pending <= 0) return null;
  return <Badge>{pending === 1 ? "1 na fila" : `${pending} na fila`}</Badge>;
}
