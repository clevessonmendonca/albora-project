"use client";

import { useMemo } from "react";
import type { VisibleMission } from "../components/client/missions-page";
import { turnIndex } from "../lib/missions-utils";

export function useMissionsProgress(missions: VisibleMission[]) {
  const doneCount = useMemo(() => missions.filter((m) => m.done).length, [missions]);
  const allDone = missions.length > 0 && doneCount === missions.length;
  const current = useMemo(() => missions.find((m) => !m.done) ?? null, [missions]);
  const index = useMemo(() => turnIndex(missions), [missions]);

  const summary = useMemo(() => {
    if (missions.length === 0) return "Modo livre";
    if (doneCount === missions.length) return `${missions.length} de ${missions.length}`;
    return `${index} de ${missions.length}`;
  }, [missions.length, doneCount, index]);

  return {
    doneCount,
    allDone,
    current,
    index,
    summary,
  };
}
