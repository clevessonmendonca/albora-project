"use client";

import { CameraIcon, HomeIcon, SettingsIcon, UsersIcon } from "@albora/ui-web";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

type IconProps = { size?: number };
type NavItem = { label: string; suffix: string; icon: ComponentType<IconProps>; exact?: boolean };

const ITEMS: NavItem[] = [
  { label: "Início", suffix: "", icon: HomeIcon, exact: true },
  { label: "Fotos", suffix: "/album", icon: CameraIcon },
  { label: "Convidados", suffix: "/guests", icon: UsersIcon },
  { label: "Evento", suffix: "/evento", icon: SettingsIcon, exact: true },
];

/** Bottom-bar do painel no mobile (o desktop usa `EventSidebar`). Fixa, alvos táteis grandes. */
export function AppNav({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/e/${eventId}`;

  return (
    <nav
      aria-label="Navegação do evento"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-linha bg-superficie sm:hidden"
    >
      <div className="flex items-stretch justify-around">
        {ITEMS.map(({ label, suffix, icon: Icon, exact }) => {
          const href = `${base}${suffix}`;
          const active = exact
            ? pathname === href || pathname === `${href}/`
            : pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1 px-2 py-1.5 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)]",
                active ? "text-acento-texto" : "text-ink-3 hover:text-ink",
              ].join(" ")}
            >
              <Icon size={22} />
              <span className="tipo-label leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
