"use client";

import React from "react";
import Link from "next/link";
import { Check, Plus } from "lucide-react";
import { Dialog } from "@albora/ui-web";
import { botaoDoPainel } from "@/features/admin/components/server/kit-do-painel";
import type { EventoDaSidebar } from "./sidebar-do-painel";

export function SeletorDeEvento({
  eventos,
  ativoId,
  aberto,
  aoFechar,
}: {
  eventos: readonly EventoDaSidebar[];
  ativoId: string | null;
  aberto: boolean;
  aoFechar: () => void;
}) {
  return (
    <Dialog open={aberto} onClose={aoFechar} aria-labelledby="titulo-seletor-de-evento">
      <div className="p-2">
        <h2
          id="titulo-seletor-de-evento"
          className="m-0 mb-1 font-[family-name:var(--fonte-titulo)] text-[1.25rem] text-ink"
        >
          Trocar de evento
        </h2>
        <p className="m-0 mb-5 text-[13px] text-ink-2">
          Cada evento tem seu próprio álbum, convidados e telão.
        </p>

        <ul className="m-0 flex max-h-[50vh] list-none flex-col gap-1 overflow-y-auto p-0">
          {eventos.map((evento) => {
            const ativo = evento.id === ativoId;

            return (
              <li key={evento.id}>
                <Link
                  href={`/admin/e/${evento.id}`}
                  onClick={aoFechar}
                  aria-current={ativo ? "true" : undefined}
                  className={[
                    "flex min-h-11 items-center gap-3 rounded-xl border p-3 no-underline",
                    "transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)]",
                    ativo
                      ? "border-acento-borda bg-acento-fundo"
                      : "border-linha hover:border-acento-borda",
                  ].join(" ")}
                >
                  <span
                    aria-hidden
                    className="grid h-9 w-9 flex-none place-items-center rounded-[9px] bg-acento font-[family-name:var(--fonte-titulo)] text-sobre-acento"
                  >
                    {evento.monograma}
                  </span>
                  <span className="min-w-0 flex-1">
                    <strong className="block truncate text-sm text-ink">{evento.nome}</strong>
                    <small className="text-[12px] text-ink-2">{evento.data}</small>
                  </span>
                  {ativo && <Check size={18} aria-hidden className="text-acento-texto" />}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Link
            href="/admin"
            onClick={aoFechar}
            className={botaoDoPainel({ variant: "light" })}
          >
            Ver todos
          </Link>
          <Link
            href="/admin/new"
            onClick={aoFechar}
            className={botaoDoPainel({ variant: "primary" })}
          >
            <Plus size={16} aria-hidden />
            Criar evento
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
