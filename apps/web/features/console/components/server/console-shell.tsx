import React, { type ReactNode } from "react";
import type { Actor } from "@albora/core";
import { adminVars } from "@/features/admin/components/server/admin-shell";
import { ImpersonationBanner, type ActiveImpersonation } from "@/features/console/components/client/impersonation-banner";
import {
  PendingImpersonationApprovals,
  type PendingImpersonationRow,
} from "@/features/console/components/client/pending-impersonation-approvals";
import { ConsoleNav, type ConsoleNavCounts } from "./console-nav";

/**
 * Modo Operate: densidade alta, console sempre claro. `adminVars()` sem
 * override de `background` — o evento aberto pode estar em modo escuro, mas
 * o console nunca se repinta conforme a identidade do casal (CLAUDE.md
 * §Identidade visual).
 *
 * `ImpersonationBanner` no topo (aqui) — nunca fechável, sempre visível
 * enquanto a janela está ativa, mesmo fora da tela do cliente impersonado
 * (T10, spec §7/§11). `PendingImpersonationApprovals` também vive aqui,
 * não numa página própria: "direto da barra de contexto" é o desenho — o
 * dono aprova/nega de qualquer tela do console, sem navegar pra lugar
 * nenhum. A página que monta `ConsoleShell` (`layout.tsx`) já filtra os
 * pedidos por capacidade antes de buscar — `support` nunca recebe a lista.
 */
export function ConsoleShell({
  actor,
  counts,
  activeImpersonation = null,
  pendingImpersonationRequests = [],
  children,
}: {
  actor: Actor;
  counts?: ConsoleNavCounts | undefined;
  activeImpersonation?: ActiveImpersonation | null;
  pendingImpersonationRequests?: PendingImpersonationRow[];
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col font-[family-name:var(--fonte-corpo)] text-ink" style={adminVars()}>
      <ImpersonationBanner active={activeImpersonation} />
      <div className="flex min-h-0 flex-1">
        <aside className="w-60 shrink-0 border-r border-linha bg-superficie elev-1 max-xl:w-16 max-[899px]:contents max-[899px]:border-none max-[899px]:bg-transparent">
          <ConsoleNav actor={actor} counts={counts} activeImpersonation={activeImpersonation} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-linha bg-superficie px-4">
            <span className="tipo-den-titulo shrink-0">Console</span>
            <label className="relative ml-2 hidden flex-1 min-[900px]:block">
              <span className="sr-only">Buscar</span>
              <input
                type="search"
                placeholder="Buscar…"
                className="tipo-den-corpo w-full max-w-md rounded-superficie border border-linha bg-superficie-alta py-2 pl-3 pr-12 text-ink placeholder:text-ink-3 focus:border-acento-texto focus:outline-none"
              />
              <kbd className="tipo-den-rotulo pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-3">
                ⌘K
              </kbd>
            </label>
            <select
              aria-label="Período"
              defaultValue="30d"
              className="tipo-den-corpo ml-auto shrink-0 rounded-superficie border border-linha bg-superficie-alta px-3 py-2 text-ink"
            >
              <option value="hoje">Hoje</option>
              <option value="7d">7 dias</option>
              <option value="30d">30 dias</option>
            </select>
            <span
              className="tipo-den-rotulo flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-superficie-alta text-ink-2"
              title={actor.staffUserId}
            >
              {actor.staffUserId.slice(0, 2).toUpperCase()}
            </span>
          </header>
          <main className="flex-1 overflow-y-auto p-[clamp(1.5rem,4vw,3rem)]">
            <PendingImpersonationApprovals requests={pendingImpersonationRequests} />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
