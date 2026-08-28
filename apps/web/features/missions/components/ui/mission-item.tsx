"use client";

import Link from "next/link";
import { Star } from "@albora/ui-web";
import type { VisibleMission } from "../client/missions-page";
import { photoPathForMission, toRoman } from "../../lib/missions-utils";

type MissionItemProps = {
  slug: string;
  mission: VisibleMission;
  index: number;
  highlighted: boolean;
};

export function MissionItem({ slug, mission, index, highlighted }: MissionItemProps) {
  const icon = (
    <span
      className={[
        "grid size-10 flex-none place-items-center rounded-token border",
        mission.done
          ? "border-acento bg-superficie-alta"
          : "border-linha bg-superficie",
      ].join(" ")}
    >
      <Star size={18} filled={mission.done} />
    </span>
  );

  const body = (
    <>
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block font-titulo text-base leading-[1.25]">
          {mission.emoji ? `${mission.emoji} ` : ""}
          {mission.title}
        </span>
        <span className="text-[0.75rem] text-ink-3">
          {mission.done ? "Feita" : `Missão ${toRoman(index)}`}
        </span>
      </span>
    </>
  );

  const shellClass = [
    "flex w-full items-center gap-3.5 rounded-token border px-4 py-3.5 text-left",
    highlighted && !mission.done
      ? "border-linha bg-superficie-alta"
      : "border-transparent bg-superficie",
  ].join(" ");

  if (mission.done) {
    return (
      <div className={`${shellClass} text-ink-2`} aria-disabled>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={photoPathForMission(slug, mission.id)}
      className={`${shellClass} text-inherit no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta`}
    >
      {body}
    </Link>
  );
}
