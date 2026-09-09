"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import type { Actor, StaffRole } from "@albora/core";
import { signOutAction } from "@/features/console/actions";
import { ChevronIcon, SairIcon } from "@/features/console/components/server/console-icons";

const ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  owner: "Owner",
  support: "Suporte",
  finance: "Financeiro",
  compliance: "Compliance",
  engineering: "Engenharia",
};

export function papeisLegiveis(roles: readonly StaffRole[]): string {
  return roles.map((role) => ROLE_LABELS[role]).join(" · ");
}

export function iniciaisDoOperador(staffUserId: string): string {
  return staffUserId.slice(0, 2).toUpperCase();
}

/**
 * O protótipo v5 desenha "Meu perfil" e "Preferências" aqui. Nenhuma das duas
 * páginas existe — desenhar o item seria link morto, que a spec §3 proíbe.
 * Entram junto com as telas, não antes.
 */
export function ConsoleProfileMenu({ actor, recolhida = false }: { actor: Actor; recolhida?: boolean }) {
  const [aberto, setAberto] = useState(false);
  const menuId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(ev: MouseEvent) {
      if (!wrapRef.current?.contains(ev.target as Node)) setAberto(false);
    }
    function aoTeclar(ev: KeyboardEvent) {
      if (ev.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
      document.removeEventListener("keydown", aoTeclar);
    };
  }, [aberto]);

  return (
    <div ref={wrapRef} className="relative border-t border-linha pt-3">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        aria-controls={menuId}
        title={actor.staffUserId}
        className={[
          "tipo-den-corpo flex min-h-11 w-full items-center gap-2.5 rounded-superficie px-2 py-2 text-left text-ink",
          "transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:bg-superficie-alta",
          recolhida ? "justify-center" : "",
        ].join(" ")}
      >
        <span
          aria-hidden
          className="tipo-den-rotulo flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-superficie-alta text-ink-2"
        >
          {iniciaisDoOperador(actor.staffUserId)}
        </span>
        {!recolhida && (
          <>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="tipo-den-corpo truncate text-ink">{actor.staffUserId}</span>
              <span className="tipo-den-meta truncate text-ink-3">{papeisLegiveis(actor.roles)}</span>
            </span>
            <span className={aberto ? "-rotate-90 text-ink-3" : "rotate-90 text-ink-3"}>
              <ChevronIcon size={14} />
            </span>
          </>
        )}
      </button>

      <div
        id={menuId}
        role="menu"
        hidden={!aberto}
        className={[
          "absolute bottom-full left-0 z-50 mb-2 w-56 rounded-superficie border border-linha bg-superficie p-1 elev-2",
          recolhida ? "left-[calc(100%+0.5rem)] bottom-0 mb-0" : "",
        ].join(" ")}
      >
        <p className="tipo-den-meta m-0 px-3 py-2 text-ink-3">{papeisLegiveis(actor.roles)}</p>
        <form action={signOutAction}>
          <button
            type="submit"
            role="menuitem"
            className="tipo-den-corpo flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-superficie border-none bg-transparent px-3 py-2 text-left text-ink-2 transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:bg-superficie-alta hover:text-ink"
          >
            <SairIcon size={16} />
            Sair do console
          </button>
        </form>
      </div>
    </div>
  );
}
