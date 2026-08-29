import React from "react";
import Link from "next/link";
import { Badge, Frame } from "@albora/ui-web";
import { photoPathForMission } from "@/features/missions/lib/missions-utils";
import type { CoverMoment } from "../../types/cover";

type MomentCardProps = {
  moment: CoverMoment;
  slug: string;
  index: number;
  central: boolean;
  interactionOpen: boolean;
};

export function MomentCard({
  moment,
  slug,
  index,
  central,
  interactionOpen,
}: MomentCardProps) {
  const href = photoPathForMission(slug, moment.missionFilterId);

  return (
    <Link
      href={href}
      aria-label={`Fotografar ${moment.title}`}
      className={`relative aspect-[9/16] shrink-0 snap-center overflow-hidden rounded-token text-inherit no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 ${
        central ? "w-[9.25rem]" : "w-20 opacity-60"
      }`}
    >
      {moment.thumbUrl ? (
        <img src={moment.thumbUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Frame label="" atmosphere variant={index * 6 + 2} />
      )}

      <span className="absolute inset-0 bg-gradient-moment-scrim" />

      {central && interactionOpen ? (
        <span className="absolute left-2 top-2">
          <Badge tone="accent">
            <span className="pulso size-1 rounded-full bg-current" />
            agora
          </Badge>
        </span>
      ) : null}

      <span className="absolute inset-x-2.5 bottom-2.5 block">
        <span
          className={`block font-titulo leading-tight tracking-titulo ${
            central ? "text-[0.9375rem]" : "text-[0.6875rem]"
          }`}
        >
          {moment.title}
        </span>
        {central && moment.contributorsLabel ? (
          <span className="mt-0.5 block truncate text-[0.625rem] leading-tight text-ink-2 opacity-85">
            {moment.contributorsLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
