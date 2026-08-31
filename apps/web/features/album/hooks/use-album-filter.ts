"use client";

import { useMemo, useState } from "react";

export type AlbumMission = { id: string; title: string };

export function useAlbumFilter(
  missions: AlbumMission[],
  initialMission: string | null = null,
) {
  const [missionId, setMissionId] = useState<string | null>(() => {
    if (initialMission && missions.some((m) => m.id === initialMission)) {
      return initialMission;
    }
    return null;
  });

  const filtroAtivo = useMemo(
    () => missions.find((m) => m.id === missionId) ?? null,
    [missions, missionId],
  );

  const setFiltro = (id: string | null) => {
    setMissionId(id);
  };

  const limpar = () => {
    setMissionId(null);
  };

  const alternar = (id: string) => {
    setMissionId((prev) => (prev === id ? null : id));
  };

  return {
    missionId,
    filtroAtivo,
    setFiltro,
    limpar,
    alternar,
  };
}
