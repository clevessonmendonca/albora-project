"use client";

import React from "react";
import { type ModoInteracao } from "@albora/core";
import Link from "next/link";
import { CameraIcon } from "@albora/ui-web";
import type { PeriodoTemporal } from "../../hooks/use-temporal-filter";

type FeedEmptyStateProps = {
  interacao: ModoInteracao;
  filtroMissao: string | null;
  filtroMissaoTitulo?: string | undefined;
  filtroPeriodo?: PeriodoTemporal | undefined;
  cameraPath: string;
};

function rotuloFiltroPeriodo(periodo: PeriodoTemporal): string {
  switch (periodo) {
    case "hoje":
      return "hoje";
    case "ontem":
      return "ontem";
    case "semana":
      return "esta semana";
    default:
      return "";
  }
}

export function FeedEmptyState({
  filtroMissao,
  filtroMissaoTitulo,
  filtroPeriodo = "tudo",
  cameraPath,
}: FeedEmptyStateProps) {
  const temFiltroMissao = filtroMissao !== null;
  const temFiltroPeriodo = filtroPeriodo !== "tudo";

  let titulo = "Ainda não tem foto";
  let sugestao = "Seja o primeiro.";

  if (temFiltroPeriodo && !temFiltroMissao) {
    titulo = `Nenhuma foto ${rotuloFiltroPeriodo(filtroPeriodo)}`;
    sugestao = "Tire uma agora ou explore outros períodos.";
  } else if (temFiltroMissao && !temFiltroPeriodo) {
    titulo = `Ninguém fez "${filtroMissaoTitulo ?? "essa missão"}" ainda`;
    sugestao = "Sua foto pode ser a primeira.";
  } else if (temFiltroMissao && temFiltroPeriodo) {
    titulo = `Nenhuma foto de "${filtroMissaoTitulo ?? "missão"}" ${rotuloFiltroPeriodo(filtroPeriodo)}`;
    sugestao = "Tire uma agora ou ajuste os filtros.";
  }

  return (
    <div className="flex min-h-[380px] flex-col items-center justify-center px-[calc(var(--espaco)*8)] py-[calc(var(--espaco)*12)] text-center">
      <div
        aria-hidden
        className="mb-[calc(var(--espaco)*4)] grid size-14 place-items-center rounded-full bg-superficie-alta text-ink-3"
      >
        <CameraIcon size={24} />
      </div>

      <p className="tipo-subtitle tipo-balance mb-[calc(var(--espaco)*3)] text-ink">{titulo}</p>

      <p className="tipo-body mb-[calc(var(--espaco)*8)] max-w-[420px] text-ink-2">{sugestao}</p>

      <Link
        href={cameraPath}
        className="inline-flex min-h-[54px] items-center justify-center rounded-pilula bg-acento px-[calc(var(--espaco)*6)] font-corpo text-[0.9375rem] font-medium tracking-[0.05em] text-sobre-acento shadow-suave transition-transform duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Tirar foto
      </Link>
    </div>
  );
}
