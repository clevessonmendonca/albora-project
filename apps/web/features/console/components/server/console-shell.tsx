import React, { type ReactNode } from "react";
import type { Actor } from "@albora/core";
import { adminVars } from "@/features/admin/components/server/admin-shell";
import { ConsoleFrame } from "@/features/console/components/client/console-frame";
import { ImpersonationBanner, type ActiveImpersonation } from "@/features/console/components/client/impersonation-banner";
import {
  PendingImpersonationApprovals,
  type PendingImpersonationRow,
} from "@/features/console/components/client/pending-impersonation-approvals";
import type { ConsoleNavCounts } from "./console-nav";

/**
 * Modo Operate: densidade alta, console sempre claro. `adminVars()` sem
 * override de `background` — o evento aberto pode estar em modo escuro, mas
 * o console nunca se repinta conforme a identidade do casal (CLAUDE.md
 * §Identidade visual).
 *
 * `ImpersonationBanner` acima da moldura — nunca fechável, sempre visível
 * enquanto a janela está ativa, mesmo fora da tela do cliente impersonado
 * (T10, spec §7/§11). `PendingImpersonationApprovals` também vive aqui,
 * não numa página própria: "direto da barra de contexto" é o desenho — o
 * dono aprova/nega de qualquer tela do console, sem navegar pra lugar
 * nenhum. A página que monta `ConsoleShell` (`layout.tsx`) já filtra os
 * pedidos por capacidade antes de buscar — `support` nunca recebe a lista.
 *
 * `periodo` é slot, não peça fixa: seletor de período só existe na tela que
 * de fato filtra por ele (spec §4.1). Oferecer o controle onde ele não muda
 * nada ensina o operador a desconfiar do filtro.
 */
export function ConsoleShell({
  actor,
  counts,
  periodo,
  recolhidaInicial = false,
  activeImpersonation = null,
  pendingImpersonationRequests = [],
  children,
}: {
  actor: Actor;
  counts?: ConsoleNavCounts | undefined;
  periodo?: ReactNode;
  recolhidaInicial?: boolean;
  activeImpersonation?: ActiveImpersonation | null;
  pendingImpersonationRequests?: PendingImpersonationRow[];
  children: ReactNode;
}) {
  return (
    <div className="font-[family-name:var(--fonte-corpo)] text-ink" style={adminVars()}>
      <ImpersonationBanner active={activeImpersonation} />
      <ConsoleFrame actor={actor} counts={counts} periodo={periodo} recolhidaInicial={recolhidaInicial}>
        <PendingImpersonationApprovals requests={pendingImpersonationRequests} />
        {children}
      </ConsoleFrame>
    </div>
  );
}
