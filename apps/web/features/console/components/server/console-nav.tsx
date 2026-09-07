"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasCapability, type Actor, type Capability, type StaffRole } from "@albora/core";
import { StatusBadge } from "@albora/ui-web";
import { signOutAction } from "@/features/console/actions";
import { ImpersonationBanner, type ActiveImpersonation } from "@/features/console/components/client/impersonation-banner";

const ROLE_LABELS: Readonly<Record<StaffRole, string>> = {
  owner: "Owner",
  support: "Suporte",
  finance: "Financeiro",
  compliance: "Compliance",
  engineering: "Engenharia",
};

export type ConsoleNavGroupId = "negocio" | "operacao" | "governanca";

export type ConsoleNavItem = {
  readonly href: string;
  readonly label: string;
  readonly capability: Capability;
  readonly group: ConsoleNavGroupId;
};

export const CONSOLE_NAV_GROUP_LABELS: Readonly<Record<ConsoleNavGroupId, string>> = {
  negocio: "Negócio",
  operacao: "Operação",
  governanca: "Governança",
};

const CONSOLE_NAV_GROUP_ORDER: readonly ConsoleNavGroupId[] = ["negocio", "operacao", "governanca"];

/** Mapa item→capacidade num único array tipado (§7 do adendo) — nunca espalhado em condicionais. */
export const CONSOLE_NAV_ITEMS: readonly ConsoleNavItem[] = [
  { href: "/console", label: "Visão geral", capability: "analytics.platform.read", group: "negocio" },
  { href: "/console/accounts", label: "Contas", capability: "accounts.read", group: "negocio" },
  { href: "/console/events", label: "Eventos", capability: "events.read", group: "negocio" },
  { href: "/console/subscriptions", label: "Assinaturas", capability: "subscription.read", group: "negocio" },
  { href: "/console/support", label: "Suporte", capability: "tickets.read", group: "operacao" },
  { href: "/console/lgpd", label: "LGPD", capability: "lgpd.dsar.read", group: "operacao" },
  { href: "/console/audit", label: "Auditoria", capability: "audit.read", group: "governanca" },
  { href: "/console/security", label: "Segurança", capability: "security.read", group: "governanca" },
  { href: "/console/staff", label: "Equipe", capability: "staff.manage", group: "governanca" },
];

/** Item sem a capacidade não aparece — nem desabilitado. */
export function visibleNavItems(actor: Actor): ConsoleNavItem[] {
  return CONSOLE_NAV_ITEMS.filter((item) => hasCapability(actor.roles, item.capability));
}

export type ConsoleNavGroupView = {
  readonly group: ConsoleNavGroupId;
  readonly label: string;
  readonly items: readonly ConsoleNavItem[];
};

/** Agrupa em Negócio/Operação/Governança; grupo cujos itens todos sumiram não aparece — nem o rótulo. */
export function groupedVisibleNavItems(actor: Actor): ConsoleNavGroupView[] {
  const visible = visibleNavItems(actor);
  return CONSOLE_NAV_GROUP_ORDER.map((group) => ({
    group,
    label: CONSOLE_NAV_GROUP_LABELS[group],
    items: visible.filter((item) => item.group === group),
  })).filter((grupo) => grupo.items.length > 0);
}

export type ConsoleNavBadge = { readonly count: number; readonly critico?: boolean };
export type ConsoleNavCounts = Partial<Record<string, ConsoleNavBadge>>;

/** Contador é trabalho pendente: zero não renderiza a pílula — um badge "0" ensina a ignorar badges. */
export function navBadgeFor(counts: ConsoleNavCounts | undefined, href: string): ConsoleNavBadge | null {
  const badge = counts?.[href];
  if (!badge || badge.count <= 0) return null;
  return badge;
}

function NavLink({
  item,
  active,
  badge,
  onNavigate,
}: {
  item: ConsoleNavItem;
  active: boolean;
  badge: ConsoleNavBadge | null;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={[
        "tipo-den-corpo relative flex min-h-11 items-center gap-2.5 rounded-superficie border-l-2 px-3 py-2 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)]",
        active
          ? "border-acento bg-acento-superficie text-acento"
          : "border-transparent text-ink-2 hover:bg-superficie-alta hover:text-ink",
      ].join(" ")}
    >
      <span
        aria-hidden
        className="hidden h-5 w-5 shrink-0 items-center justify-center rounded-full bg-superficie-alta tipo-den-rotulo min-[900px]:max-[1279px]:inline-flex"
      >
        {item.label[0]}
      </span>
      <span className="min-[900px]:max-[1279px]:sr-only">{item.label}</span>
      {badge && (
        <span className="ml-auto min-[900px]:max-[1279px]:hidden">
          <StatusBadge tone={badge.critico ? "critico" : "neutral"}>{badge.count}</StatusBadge>
        </span>
      )}
    </Link>
  );
}

/**
 * Navegação do console — filtra por capacidade, agrupa em Negócio/Operação/
 * Governança e resolve os três recortes de largura do §7: rail completo
 * (≥1280px), rail só-ícone (900–1279px) e gaveta com pano de fundo (<900px).
 *
 * A gaveta usa `display: contents` no `<aside>` que a envolve (ver
 * console-shell.tsx) pra escapar do box do wrapper sem herdar seu overflow —
 * o botão, o pano de fundo e a lista viram `position: fixed` e não dependem
 * mais da largura do ancestral.
 */
export function ConsoleNav({
  actor,
  counts,
  activeImpersonation = null,
}: {
  actor: Actor;
  counts?: ConsoleNavCounts | undefined;
  activeImpersonation?: ActiveImpersonation | null;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = groupedVisibleNavItems(actor);

  const isActive = (href: string) => (href === "/console" ? pathname === "/console" : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-controls="console-nav-drawer"
        aria-label="Abrir navegação"
        className="fixed left-4 top-4 z-30 hidden h-11 w-11 items-center justify-center rounded-superficie border border-linha bg-superficie text-ink max-[899px]:inline-flex"
      >
        <span aria-hidden>☰</span>
      </button>

      {open && (
        <button
          type="button"
          aria-label="Fechar navegação"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 border-none bg-ink/40 p-0 max-[899px]:block min-[900px]:hidden"
        />
      )}

      <nav
        id="console-nav-drawer"
        aria-label="Navegação do console"
        className={[
          "flex h-full flex-col gap-6 overflow-y-auto p-4",
          "max-[899px]:fixed max-[899px]:inset-y-0 max-[899px]:left-0 max-[899px]:z-50 max-[899px]:w-60 max-[899px]:border-r max-[899px]:border-linha max-[899px]:bg-superficie max-[899px]:elev-1 max-[899px]:transition-transform max-[899px]:duration-[var(--tempo)] max-[899px]:ease-[var(--curva)]",
          open ? "max-[899px]:translate-x-0" : "max-[899px]:-translate-x-full",
        ].join(" ")}
      >
        {groups.map((grupo) => (
          <div key={grupo.group} className="flex flex-col gap-1">
            <span className="tipo-den-rotulo px-3 text-ink-3 min-[900px]:max-[1279px]:hidden">{grupo.label}</span>
            {grupo.items.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={isActive(item.href)}
                badge={navBadgeFor(counts, item.href)}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </div>
        ))}

        <div className="mt-auto flex flex-col gap-2 border-t border-linha pt-4 min-[900px]:max-[1279px]:hidden">
          {activeImpersonation && <ImpersonationBanner active={activeImpersonation} />}
          <span className="tipo-den-corpo truncate text-ink" title={actor.staffUserId}>
            {actor.staffUserId}
          </span>
          <span className="tipo-den-rotulo text-ink-3">{actor.roles.map((role) => ROLE_LABELS[role]).join(" · ")}</span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="tipo-den-corpo w-full cursor-pointer rounded-superficie border border-linha bg-transparent px-3 py-2 text-ink-2 transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
            >
              Sair
            </button>
          </form>
        </div>
      </nav>
    </>
  );
}
