import Link from "next/link";
import type { ReactNode } from "react";

type CoverShortcutProps = {
  href: string;
  label: string;
  value: string;
  icon: ReactNode;
  primary?: boolean;
  valueClass?: string;
};

export function CoverShortcut({
  href,
  label,
  value,
  icon,
  primary = false,
  valueClass,
}: CoverShortcutProps) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-[0.3125rem] rounded-token bg-superficie px-1 py-3 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta ${
        primary ? "text-ink" : "text-ink-2 opacity-85"
      }`}
    >
      {icon}
      <span className="text-[0.625rem] uppercase tracking-rotulo">{label}</span>
      <span
        className={`text-[0.6875rem] ${primary ? "text-ink" : "text-ink-2"} ${valueClass ?? ""}`}
      >
        {value}
      </span>
    </Link>
  );
}
