"use client";

import type { ReactNode } from "react";
import {
  Badge,
  GuestHeader,
  GuestShell,
  MissionBanner,
} from "@albora/ui-web";

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
  onBack?: () => void;
  footer?: ReactNode;
}) {
  return (
    <GuestShell>
      <div className="flex min-h-0 flex-1 flex-col pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <div className="px-[1.125rem]">
          <GuestHeader title={eventTitle} action={headerAction} />
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="mb-2 cursor-pointer border-0 bg-transparent p-0 text-[0.75rem] uppercase tracking-rotulo text-ink-3"
            >
              ← Missões
            </button>
          )}
        </div>

        <div className="relative mx-3 min-h-[18rem] flex-1 overflow-hidden rounded-superficie bg-superficie bg-superficie-vignette">
          {mission && (
            <div className="absolute inset-x-4 top-4 z-[1]">
              <MissionBanner
                index={mission.index}
                total={mission.total}
                title={mission.title}
              />
            </div>
          )}

          {places.length > 0 && (
            <div className="absolute inset-x-4 bottom-4 z-[1] flex flex-wrap gap-2">
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

        {footer ? <div className="px-[1.125rem]">{footer}</div> : null}
      </div>
    </GuestShell>
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
      className="cursor-pointer border-0 bg-transparent p-0 font-[inherit]"
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
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-7 pt-6 pb-3">
      <span className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <RecentThumb key={i} url={recentThumbs[i]} />
        ))}
      </span>

      <button
        type="button"
        aria-label="Fotografar"
        disabled={processing}
        onClick={onShutter}
        className="grid size-[4.5rem] place-items-center justify-self-center rounded-full border-[3px] border-ink bg-transparent transition-transform duration-[var(--tempo-rapido)] ease-[var(--curva)] disabled:cursor-default disabled:opacity-40 active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        <span className="size-[3.625rem] rounded-full bg-acento transition-transform duration-[var(--tempo-rapido)] ease-[var(--curva)] motion-reduce:transition-none" />
      </button>

      <button
        type="button"
        onClick={onRoll}
        disabled={processing}
        className="justify-self-end min-h-12 border-0 bg-transparent px-2 font-titulo text-[0.75rem] uppercase tracking-[0.22em] text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] disabled:cursor-default disabled:opacity-40 motion-reduce:transition-none"
      >
        Rolo
      </button>
    </div>
  );
}

function RecentThumb({ url }: { url: string | undefined }) {
  if (!url) {
    return (
      <span
        className="relative size-[2rem] overflow-hidden rounded-[0.5rem] bg-superficie-alta"
        aria-hidden
      />
    );
  }

  return (
    <span className="relative size-[2rem] overflow-hidden rounded-[0.5rem] bg-superficie-alta ring-1 ring-inset ring-linha">
      <img src={url} alt="" className="block size-full object-cover" />
    </span>
  );
}

export function QueueLabel({ pending }: { pending: number }) {
  if (pending <= 0) return null;
  return <Badge>{pending === 1 ? "1 na fila" : `${pending} na fila`}</Badge>;
}
