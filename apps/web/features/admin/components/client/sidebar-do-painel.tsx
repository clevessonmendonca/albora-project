"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { adminVars } from "@/features/admin/lib/chrome-do-painel";
import {
  destinoAtivo,
  destinosDoGrupo,
  GRUPOS,
  type Destino,
} from "@/features/admin/lib/navegacao";
import { ICONES_DA_NAVEGACAO } from "@/features/admin/lib/icones-da-navegacao";
import { useModerationCount } from "./moderation-count-context";

export type PerfilDoPainel = {
  nome: string;
  plano: string;
};

export type EventoDaSidebar = {
  id: string;
  nome: string;
  /** Já formatada para leitura — a sidebar não decide fuso. */
  data: string;
  monograma: string;
};

type Props = {
  evento: EventoDaSidebar;
  perfil: PerfilDoPainel;
  aberta: boolean;
  aoNavegar: () => void;
  aoTrocarEvento: () => void;
};

export function SidebarDoPainel({
  evento,
  perfil,
  aberta,
  aoNavegar,
  aoTrocarEvento,
}: Props) {
  const pathname = usePathname();
  const { count } = useModerationCount();
  const base = `/admin/e/${evento.id}`;
  const ativo = destinoAtivo(pathname, base);

  const item = (destino: Destino) => {
    const Icone = ICONES_DA_NAVEGACAO[destino.id];
    const marcado = ativo === destino.id;
    const pendencia = destino.id === "album" && count > 0;

    return (
      <Link
        key={destino.id}
        href={`${base}${destino.suffix}`}
        onClick={aoNavegar}
        aria-current={marcado ? "page" : undefined}
        className={[
          "relative flex min-h-11 items-center gap-3 rounded-[9px] px-[15px] text-[13px] font-semibold no-underline",
          "transition-[background,color,transform] duration-[var(--tempo-rapido)] ease-[var(--curva)]",
          marcado
            ? "bg-superficie-alta text-ink before:absolute before:left-0 before:h-[27px] before:w-[3px] before:rounded-r-[3px] before:bg-acento before:content-['']"
            : "text-ink-2 hover:translate-x-0.5 hover:bg-superficie hover:text-ink",
        ].join(" ")}
      >
        <Icone size={18} strokeWidth={1.8} aria-hidden />
        <span className="truncate">{destino.rotulo}</span>
        {pendencia && (
          <span className="ml-auto rounded-[10px] bg-critico px-[7px] py-0.5 text-[10px] leading-normal text-sobre-acento">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      id="sidebar-do-painel"
      style={adminVars("dark")}
      data-aberta={aberta ? "" : undefined}
      className={[
        "z-30 flex h-dvh w-[270px] shrink-0 flex-col overflow-y-auto border-r border-linha bg-bg",
        "px-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-[30px] text-ink",
        "font-[family-name:var(--fonte-corpo)]",
        // ≤ md a sidebar é gaveta; acima, coluna fixa do grid.
        "fixed inset-y-0 left-0 -translate-x-full transition-transform duration-[var(--tempo)] ease-[var(--curva)]",
        aberta ? "translate-x-0 shadow-alta" : "",
        "md:sticky md:top-0 md:w-[218px] md:translate-x-0 md:shadow-none xl:w-[248px]",
      ].join(" ")}
    >
      <Link
        href="/admin"
        onClick={aoNavegar}
        className="flex items-center gap-[11px] px-[18px] pb-[29px] pt-0.5 font-[family-name:var(--fonte-titulo)] text-[27px] tracking-[-0.04em] text-ink no-underline"
      >
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-[50%_50%_45%_45%] border-[1.5px] border-acento text-[20px] italic leading-none text-acento"
        >
          A
        </span>
        álbora<span className="text-acento">.</span>
      </Link>

      <button
        type="button"
        onClick={aoTrocarEvento}
        className="mx-[5px] mb-[7px] flex min-h-[66px] w-[calc(100%-10px)] cursor-pointer items-center gap-2.5 rounded-xl border border-linha bg-superficie p-[12px_13px] text-left text-ink"
      >
        <span
          aria-hidden
          className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[9px] bg-acento font-[family-name:var(--fonte-titulo)] text-sobre-acento"
        >
          {evento.monograma}
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block max-w-[145px] truncate text-[13px] text-ink">
            {evento.nome}
          </strong>
          <small className="text-[11px] text-ink-3">{evento.data}</small>
        </span>
      </button>

      <Link
        href="/admin"
        onClick={aoNavegar}
        className="flex justify-between border-0 px-[18px] pb-[17px] pt-2 text-[12px] text-ink-2 no-underline hover:text-acento-texto"
      >
        Meus eventos <span aria-hidden>+</span>
      </Link>

      {GRUPOS.map((grupo) => (
        <React.Fragment key={grupo.id}>
          <div className="mx-[17px] mb-[9px] mt-[15px] text-[10px] font-bold uppercase tracking-[0.15em] text-ink-3">
            {grupo.rotulo}
          </div>
          <nav
            aria-label={grupo.rotulo}
            data-admin-nav
            className="flex shrink-0 flex-col gap-[3px]"
          >
            {destinosDoGrupo(grupo.id).map(item)}
          </nav>
        </React.Fragment>
      ))}

      <div className="mt-auto border-t border-linha pt-[18px]">
        <Link
          href={`${base}/ajustes#como-funciona`}
          onClick={aoNavegar}
          className="flex items-center gap-[11px] px-[15px] py-[11px] text-[13px] text-ink-2 no-underline hover:text-ink"
        >
          <Sparkles size={18} strokeWidth={1.8} aria-hidden />
          Como funciona
        </Link>
        <div className="mx-[5px] mt-3 flex items-center gap-2.5 rounded-xl border border-linha p-3 text-ink">
          <span
            aria-hidden
            className="grid h-[34px] w-[34px] flex-none place-items-center rounded-full bg-acento text-[11px] font-bold text-sobre-acento"
          >
            {iniciais(perfil.nome)}
          </span>
          <span className="min-w-0">
            <strong className="block truncate text-[12px]">{perfil.nome}</strong>
            <small className="block text-[11px] text-ink-3">{perfil.plano}</small>
          </span>
        </div>
      </div>
    </aside>
  );
}

function iniciais(nome: string): string {
  const partes = nome.trim().split(/[\s@._-]+/).filter(Boolean);
  const letras = partes.slice(0, 2).map((p) => p[0] ?? "");
  return letras.join("").toUpperCase() || "?";
}
