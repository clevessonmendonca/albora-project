"use client";

import { useEffect, useRef, useState } from "react";
import type { VisibleMission } from "../components/client/missions-page";
import {
  chaveProgressoMissoes,
  marcoMissao,
  MISSIONS_PROGRESS_KEY,
  persistirProgressoMissoes,
  proximaMissao,
  type MarcoMissao,
} from "../lib/missions-utils";

type CompletionEvent = {
  mission: VisibleMission;
  nextMission: VisibleMission | null;
  milestone: MarcoMissao;
};

export function useMissionCompletionToast(missions: VisibleMission[]) {
  const [event, setEvent] = useState<CompletionEvent | null>(null);
  const lastStateRef = useRef<string | null>(null);

  useEffect(() => {
    if (missions.length === 0) return;

    const currentState = chaveProgressoMissoes(missions);
    let savedState = lastStateRef.current;
    if (savedState === null) {
      try {
        savedState = localStorage.getItem(MISSIONS_PROGRESS_KEY);
      } catch {
        savedState = null;
      }
    }
    lastStateRef.current = currentState;

    if (!savedState || savedState === currentState) {
      persistirProgressoMissoes(missions);
      return;
    }

    const previous = savedState.split("|");
    const oldDone = previous.filter((s) => s.endsWith(":true")).length;
    const newDone = missions.filter((m) => m.done).length;

    if (newDone > oldDone) {
      const justCompleted = missions.find((m, i) => {
        const old = previous[i];
        return m.done && old !== undefined && !old.endsWith(":true");
      });

      if (justCompleted) {
        setEvent({
          mission: justCompleted,
          nextMission: proximaMissao(missions),
          milestone: marcoMissao(newDone, missions.length),
        });
      }
    }

    persistirProgressoMissoes(missions);
  }, [missions]);

  return { event, dismiss: () => setEvent(null) };
}
