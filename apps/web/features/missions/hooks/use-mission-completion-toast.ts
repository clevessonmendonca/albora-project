"use client";

import { useEffect, useRef, useState } from "react";
import type { VisibleMission } from "../components/client/missions-page";

type CompletionEvent = {
  mission: VisibleMission;
  nextMission: VisibleMission | null;
  milestone: "individual" | "halfway" | "all";
};

const STORAGE_KEY = "albora_missions_last_state";

export function useMissionCompletionToast(missions: VisibleMission[]) {
  const [event, setEvent] = useState<CompletionEvent | null>(null);
  const lastStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (missions.length === 0) return;

    const currentState = missions.map((m) => `${m.id}:${m.done}`).join("|");
    const savedState = lastStateRef.current ?? localStorage.getItem(STORAGE_KEY);
    lastStateRef.current = currentState;

    if (!savedState || savedState === currentState) {
      localStorage.setItem(STORAGE_KEY, currentState);
      return;
    }

    const previous = savedState.split("|");
    const oldDone = previous.filter((s) => s.endsWith(":true")).length;
    const newDone = missions.filter((m) => m.done).length;
    const total = missions.length;

    if (newDone > oldDone) {
      const justCompleted = missions.find((m, i) => {
        const old = previous[i];
        return m.done && old !== undefined && !old.endsWith(":true");
      });

      if (justCompleted) {
        const nextMission = missions.find((m) => !m.done) ?? null;
        let milestone: CompletionEvent["milestone"] = "individual";
        if (newDone === total) milestone = "all";
        else if (total >= 4 && newDone === Math.floor(total / 2)) milestone = "halfway";

        setEvent({ mission: justCompleted, nextMission, milestone });
      }
    }

    localStorage.setItem(STORAGE_KEY, currentState);
  }, [missions]);

  return { event, dismiss: () => setEvent(null) };
}
