"use client";

import React from "react";
import Link from "next/link";
import { NavCameraButton, SHARED_GUEST_TABS, StackIcon, type GuestTab } from "@albora/ui-web";

const TAB_FEED = {
  id: "feed" as const,
  label: "Feed",
  path: "/feed",
  column: "col-start-1",
  icon: <StackIcon />,
};

const TABS = [TAB_FEED, ...SHARED_GUEST_TABS];

function TabLink({
  href,
  active,
  label,
  icon,
  column,
}: {
  href: string;
  active: boolean;
  label: string;
  icon: React.ReactNode;
  column: string;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-1 text-[0.5625rem] uppercase tracking-rotulo no-underline ${column} ${
        active ? "text-acento" : "text-ink-3"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

export function GuestTabBar({ slug, active }: { slug: string; active?: GuestTab }) {
  const base = `/e/${encodeURIComponent(slug)}`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-[5] grid grid-cols-[1fr_1fr_auto_1fr_1fr] items-center border-t border-linha bg-bg px-3 pt-2.5 pb-[calc(1.625rem+env(safe-area-inset-bottom))]">
      {TABS.map((tab) => (
        <TabLink
          key={tab.id}
          column={tab.column}
          href={`${base}${tab.path}`}
          active={active === tab.id}
          label={tab.label}
          icon={tab.icon}
        />
      ))}

      <NavCameraButton href={`${base}/photo`} linkComponent={Link} />
    </nav>
  );
}
