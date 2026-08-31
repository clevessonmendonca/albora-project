"use client";

import { useCallback, useEffect, useState } from "react";

export type PeriodoTemporal = "hoje" | "ontem" | "semana" | "tudo";

const CHAVE_STORAGE = "albora:feed:periodo-temporal";

function getInicioDoDia(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getInicioDeOntem(agora: Date): Date {
  const ontem = new Date(agora);
  ontem.setDate(ontem.getDate() - 1);
  return getInicioDoDia(ontem);
}

function getInicioDaSemana(agora: Date): Date {
  const d = new Date(agora);
  const dia = d.getDay();
  const diff = dia === 0 ? 6 : dia - 1;
  d.setDate(d.getDate() - diff);
  return getInicioDoDia(d);
}

export function calcularLimiteInferior(periodo: PeriodoTemporal, agora: Date): Date | null {
  if (periodo === "tudo") return null;
  if (periodo === "hoje") return getInicioDoDia(agora);
  if (periodo === "ontem") return getInicioDeOntem(agora);
  return getInicioDaSemana(agora);
}

export function calcularLimiteSuperior(periodo: PeriodoTemporal, agora: Date): Date | null {
  if (periodo === "tudo") return null;
  if (periodo === "ontem") return getInicioDoDia(agora);
  return null;
}

function carregarDoStorage(): PeriodoTemporal {
  if (typeof window === "undefined") return "tudo";
  
  try {
    const valor = sessionStorage.getItem(CHAVE_STORAGE);
    if (valor === "hoje" || valor === "ontem" || valor === "semana") return valor;
  } catch {
    return "tudo";
  }
  
  return "tudo";
}

function salvarNoStorage(periodo: PeriodoTemporal): void {
  if (typeof window === "undefined") return;
  
  try {
    sessionStorage.setItem(CHAVE_STORAGE, periodo);
  } catch {
    // Silenciar erro de sessionStorage
  }
}

export function useTemporalFilter() {
  const [periodo, setPeriodoInterno] = useState<PeriodoTemporal>("tudo");

  useEffect(() => {
    setPeriodoInterno(carregarDoStorage());
  }, []);

  const setPeriodo = useCallback((novoPeriodo: PeriodoTemporal) => {
    setPeriodoInterno(novoPeriodo);
    salvarNoStorage(novoPeriodo);
  }, []);

  return {
    periodo,
    setPeriodo,
  };
}
