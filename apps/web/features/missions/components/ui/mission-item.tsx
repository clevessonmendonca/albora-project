"use client";

import Link from "next/link";
import { Star, cn } from "@albora/ui-web";
import type { VisibleMission } from "../client/missions-page";
import { photoPathForMission, toRoman } from "../../lib/missions-utils";

type MissionItemProps = {
  slug: string;
  mission: VisibleMission;
  index: number;
  highlighted: boolean;
};

export function MissionItem({ slug, mission, index, highlighted }: MissionItemProps) {
  const icon = mission.done ? (
    <span
      aria-hidden
      className="grid size-11 flex-none place-items-center rounded-token bg-acento text-[1.0625rem] leading-none text-sobre-acento"
    >
      ✓
    </span>
  ) : (
    <span
      aria-hidden
      className={cn(
        "grid size-11 flex-none place-items-center rounded-token border",
        highlighted ? "border-acento-borda bg-acento-superficie" : "border-linha bg-superficie",
      )}
    >
      <Star size={18} />
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

  const shellClass = cn(
    "flex min-h-11 w-full items-center gap-3.5 rounded-token px-4 py-3.5 text-left transition-[transform,opacity] duration-instantaneo ease-mola active:scale-[0.98] motion-reduce:active:scale-100",
    highlighted && !mission.done ? "elev-2" : "elev-1",
  );

  if (mission.done) {
    return (
      <div className={cn(shellClass, "text-ink-2 opacity-80")} aria-disabled>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={photoPathForMission(slug, mission.id)}
      className={cn(shellClass, "text-inherit no-underline hover:opacity-90")}
    >
      {body}
    </Link>
  );
}
