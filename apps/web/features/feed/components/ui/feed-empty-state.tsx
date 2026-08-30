"use client";

import { type ModoInteracao } from "@albora/core";
import Link from "next/link";
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
  interacao,
  filtroMissao,
  filtroMissaoTitulo,
  filtroPeriodo = "tudo",
  cameraPath,
}: FeedEmptyStateProps) {
  const espelho = interacao === "espelho";
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
      <p className="mb-[calc(var(--espaco)*3)] font-titulo font-light leading-[1.17] tracking-[-0.012em] text-ink" style={{ fontSize: "clamp(1.25rem, 5vw, 1.68rem)" }}>
        {titulo}
      </p>

      <p className="mb-[calc(var(--espaco)*8)] max-w-[420px] leading-relaxed text-ink-2" style={{ fontSize: "clamp(0.875rem, 3vw, 0.9375rem)" }}>
        {sugestao}
      </p>

      {!espelho && (
        <Link
          href={cameraPath}
          className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-acento px-[calc(var(--espaco)*6)] font-corpo text-[0.9375rem] font-medium tracking-[0.05em] text-sobre-acento transition-transform duration-[var(--tempo-rapido)] hover:scale-[0.977] active:scale-[0.977]"
        >
          Tirar foto
        </Link>
      )}
    </div>
  );
}
