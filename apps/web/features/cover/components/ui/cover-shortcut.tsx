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
      className={`elev-1 flex min-h-11 flex-col items-center justify-center gap-[0.3125rem] rounded-token px-1 py-3 no-underline transition-[transform,background-color] duration-instantaneo ease-mola active:scale-[0.97] hover:bg-superficie-alta ${
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
