"use client";

import { useCallback, useMemo, useState } from "react";

/**
 * Hook para gerenciar filtro de missões no feed.
 * 
 * @example
 * const { missionId, filtroAtivo, setFiltro, limpar } = useFeedFilter(missions);
 */

export type FilterMission = { id: string; title: string };

export function useFeedFilter(missions: FilterMission[]) {
  const [missionId, setMissionId] = useState<string | null>(null);

  const filtroAtivo = useMemo(
    () => missions.find((m) => m.id === missionId) ?? null,
    [missions, missionId]
  );

  const setFiltro = useCallback((id: string | null) => {
    setMissionId(id);
  }, []);

  const limpar = useCallback(() => {
    setMissionId(null);
  }, []);

  const alternar = useCallback((id: string) => {
    setMissionId((atual) => (atual === id ? null : id));
  }, []);

  return {
    missionId,
    filtroAtivo,
    setFiltro,
    limpar,
    alternar,
  };
}
