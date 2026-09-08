"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasCapability, type Actor, type Capability } from "@albora/core";
import { StatusBadge } from "@albora/ui-web";
import {
  AssinaturasIcon,
  AuditoriaIcon,
  ContasIcon,
  EquipeIcon,
  EventosIcon,
  LgpdIcon,
  RetencaoIcon,
  SegurancaIcon,
  SuporteIcon,
  VisaoGeralIcon,
} from "./console-icons";

export type ConsoleNavGroupId = "negocio" | "operacao" | "governanca";

export type ConsoleNavItem = {
  readonly href: string;
  readonly label: string;
  readonly capability: Capability;
  readonly group: ConsoleNavGroupId;
  /** Reforço do rótulo, nunca substituto: some do acessível, some do sentido. */
  readonly Icone: (props: { size?: number }) => React.ReactElement;
};

export const CONSOLE_NAV_GROUP_LABELS: Readonly<Record<ConsoleNavGroupId, string>> = {
  negocio: "Negócio",
  operacao: "Operação",
  governanca: "Governança",
};

const CONSOLE_NAV_GROUP_ORDER: readonly ConsoleNavGroupId[] = ["negocio", "operacao", "governanca"];

/** Mapa item→capacidade num único array tipado (§7 do adendo) — nunca espalhado em condicionais. */
export const CONSOLE_NAV_ITEMS: readonly ConsoleNavItem[] = [
  { href: "/console", label: "Visão geral", capability: "analytics.platform.read", group: "negocio", Icone: VisaoGeralIcon },
  { href: "/console/accounts", label: "Contas", capability: "accounts.read", group: "negocio", Icone: ContasIcon },
  { href: "/console/events", label: "Eventos", capability: "events.read", group: "negocio", Icone: EventosIcon },
  { href: "/console/subscriptions", label: "Assinaturas", capability: "subscription.read", group: "negocio", Icone: AssinaturasIcon },
  { href: "/console/support", label: "Suporte", capability: "tickets.read", group: "operacao", Icone: SuporteIcon },
  { href: "/console/lgpd", label: "LGPD", capability: "lgpd.dsar.read", group: "operacao", Icone: LgpdIcon },
  { href: "/console/retention", label: "Retenção", capability: "retention.read", group: "operacao", Icone: RetencaoIcon },
  { href: "/console/audit", label: "Auditoria", capability: "audit.read", group: "governanca", Icone: AuditoriaIcon },
  { href: "/console/security", label: "Segurança", capability: "security.read", group: "governanca", Icone: SegurancaIcon },
  { href: "/console/staff", label: "Equipe", capability: "staff.manage", group: "governanca", Icone: EquipeIcon },
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
  recolhida,
  onNavigate,
}: {
  item: ConsoleNavItem;
  active: boolean;
  badge: ConsoleNavBadge | null;
  recolhida: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={[
        "tipo-den-corpo relative flex min-h-11 items-center gap-2.5 rounded-superficie px-3 py-2 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)]",
        recolhida ? "justify-center px-2" : "",
        active ? "bg-ink text-superficie" : "text-ink-2 hover:bg-superficie-alta hover:text-ink",
      ].join(" ")}
    >
      <item.Icone size={17} />
      <span className={recolhida ? "sr-only" : ""}>{item.label}</span>
      {badge &&
        (recolhida ? (
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-critico">
            <span className="sr-only">{badge.count} pendente(s)</span>
          </span>
        ) : (
          <span className="ml-auto">
            <StatusBadge tone={badge.critico ? "critico" : "neutral"}>{badge.count}</StatusBadge>
          </span>
        ))}
    </Link>
  );
}

/**
 * Só a lista: agrupa em Negócio/Operação/Governança e filtra por capacidade.
 * A moldura (marca, recolher, gaveta em mobile, perfil) é do `ConsoleFrame` —
 * navegação que também sabe abrir gaveta e guardar preferência de largura vira
 * dois componentes num arquivo só.
 */
export function ConsoleNav({
  actor,
  counts,
  recolhida = false,
  onNavigate,
}: {
  actor: Actor;
  counts?: ConsoleNavCounts | undefined;
  recolhida?: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  const pathname = usePathname();
  const groups = groupedVisibleNavItems(actor);

  const isActive = (href: string) =>
    href === "/console" ? pathname === "/console" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Navegação do console" className="flex flex-col gap-5">
      {groups.map((grupo) => (
        <div key={grupo.group} className="flex flex-col gap-1">
          <span className={["px-3 font-[family-name:var(--fonte-titulo)] text-[0.68rem] uppercase tracking-[0.16em] text-ink-3", recolhida ? "sr-only" : ""].join(" ")}>
            {grupo.label}
          </span>
          {grupo.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              badge={navBadgeFor(counts, item.href)}
              recolhida={recolhida}
              onNavigate={() => onNavigate?.()}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
