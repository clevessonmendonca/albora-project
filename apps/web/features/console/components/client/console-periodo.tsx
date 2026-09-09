"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export const PERIODOS = [
  { valor: "hoje", rotulo: "Hoje", dias: 1 },
  { valor: "7d", rotulo: "7 dias", dias: 7 },
  { valor: "30d", rotulo: "30 dias", dias: 30 },
] as const;

export type PeriodoValor = (typeof PERIODOS)[number]["valor"];

export const PERIODO_PADRAO: PeriodoValor = "30d";

/**
 * Só as telas cujo dado é série temporal. A spec §4.1 é explícita: oferecer
 * o controle onde ele não muda nada ensina o operador a desconfiar do
 * filtro — e um filtro em que ninguém confia é pior que nenhum.
 */
export const ROTAS_COM_PERIODO: readonly string[] = ["/console"];

export function mostraPeriodo(pathname: string | null): boolean {
  return pathname !== null && ROTAS_COM_PERIODO.includes(pathname);
}

export function diasDoPeriodo(valor: string | undefined): number {
  return (PERIODOS.find((p) => p.valor === valor) ?? PERIODOS.find((p) => p.valor === PERIODO_PADRAO)!).dias;
}

export function periodoValido(valor: string | undefined): PeriodoValor {
  return PERIODOS.some((p) => p.valor === valor) ? (valor as PeriodoValor) : PERIODO_PADRAO;
}

export function ConsolePeriodo() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  if (!mostraPeriodo(pathname)) return null;

  const atual = periodoValido(params?.get("periodo") ?? undefined);

  return (
    <div role="group" aria-label="Período dos dados" className="flex items-center gap-1 rounded-pilula border border-linha p-1">
      {PERIODOS.map((p) => (
        <button
          key={p.valor}
          type="button"
          aria-pressed={p.valor === atual}
          onClick={() => {
            const proximos = new URLSearchParams(params?.toString() ?? "");
            proximos.set("periodo", p.valor);
            router.push(`${pathname}?${proximos.toString()}`);
          }}
          className={[
            "tipo-den-corpo min-h-9 cursor-pointer rounded-pilula border-none px-3 py-1 transition-colors duration-[var(--tempo)] ease-[var(--curva)]",
            p.valor === atual ? "bg-ink text-superficie" : "bg-transparent text-ink-2 hover:text-ink",
          ].join(" ")}
        >
          {p.rotulo}
        </button>
      ))}
    </div>
  );
}
