"use client";

import type { VisibleMission } from "../client/missions-page";
import { MissionItem } from "./mission-item";

type CompletedListProps = {
  slug: string;
  missions: readonly VisibleMission[];
};

export function CompletedList({ slug, missions }: CompletedListProps) {
  return (
    <div className="mt-8 grid gap-2">
      <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
        Missões completadas
      </p>
      <ul className="m-0 grid list-none gap-2 p-0">
        {missions.map((mission, i) => (
          <li key={mission.id}>
            <MissionItem slug={slug} mission={mission} index={i + 1} highlighted={false} />
          </li>
        ))}
      </ul>
    </div>
  );
}
