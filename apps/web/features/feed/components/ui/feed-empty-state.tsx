"use client";

import type { ModoInteracao } from "@albora/core";
import { CameraIcon } from "@albora/ui-web";

type FeedEmptyStateProps = {
  interacao: ModoInteracao;
  filtroMissao: string | null;
  filtroMissaoTitulo?: string | null;
  stats?: { total: number };
  cameraPath: string;
};

export function FeedEmptyState({
  interacao,
  filtroMissao,
  filtroMissaoTitulo,
  stats,
  cameraPath,
}: FeedEmptyStateProps) {
  const espelho = interacao === "espelho";
  const completo = !espelho;
  const temFiltro = filtroMissao !== null;

  const titulo = getTitulo(espelho, temFiltro, filtroMissaoTitulo);
  const lede = getLede(espelho, temFiltro, filtroMissaoTitulo);
  const temStats = stats && stats.total > 0 && temFiltro;

  return (
    <div className="grid gap-5 py-[calc(var(--espaco)*8)] text-center">
      <div className="grid justify-center text-ink opacity-[0.18]">
        <CameraIcon size={48} />
      </div>

      <div>
        <p className="mb-1.5 font-titulo text-[1.6rem] font-medium leading-snug tracking-titulo text-ink [text-wrap:balance]">
          {titulo}
        </p>
        <p className="m-0 leading-relaxed text-ink-2">{lede}</p>

        {temStats && (
          <p className="mt-2 text-sm text-ink-3">
            {stats.total} {stats.total === 1 ? "foto" : "fotos"} no total
          </p>
        )}
      </div>

      {completo && (
        <a
          href={cameraPath}
          className="grid w-full place-items-center rounded-pilula bg-acento px-[1.125rem] py-[1.125rem] font-semibold text-sobre-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90"
        >
          Tirar foto
        </a>
      )}
    </div>
  );
}

function getTitulo(
  espelho: boolean,
  temFiltro: boolean,
  filtroMissaoTitulo?: string | null,
): string {
  const completo = !espelho;

  if (espelho && !temFiltro) {
    return "As fotos dos convidados aparecerão aqui em breve";
  }

  if (espelho && temFiltro && filtroMissaoTitulo) {
    return `Nenhuma foto em '${filtroMissaoTitulo}' ainda`;
  }

  if (espelho && temFiltro) {
    return "Nenhuma foto nesta missão ainda";
  }

  if (completo && !temFiltro) {
    return "Seja o primeiro!";
  }

  if (completo && temFiltro && filtroMissaoTitulo) {
    return `Nenhuma foto em '${filtroMissaoTitulo}' ainda`;
  }

  return "Nenhuma foto nesta missão ainda";
}

function getLede(
  espelho: boolean,
  temFiltro: boolean,
  filtroMissaoTitulo?: string | null,
): string {
  if (espelho) {
    return "";
  }

  if (!temFiltro) {
    return "Tire uma foto e compartilhe";
  }

  if (filtroMissaoTitulo) {
    return "Que tal ser o primeiro?";
  }

  return "Que tal ser o primeiro?";
}
