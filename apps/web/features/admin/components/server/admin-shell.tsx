import type { CSSProperties, ReactNode } from "react";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import Link from "next/link";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";

export function adminVars(): CSSProperties {
  return toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;
}

type AdminShellProps = {
  title: string;
  subtitle?: string;
  back?: { label: string; href: string };
  children: ReactNode;
};

export function AdminShell({ title, subtitle, back, children }: AdminShellProps) {
  return (
    <main
      className="min-h-dvh bg-bg p-[clamp(1.5rem,5vw,4rem)] font-[family-name:var(--fonte-corpo)] text-ink"
      style={adminVars()}
    >
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          {back && (
            <Link
              href={back.href}
              className="mb-3 inline-block text-sm text-ink-3 no-underline"
            >
              ← {back.label}
            </Link>
          )}
          <h1 className="m-0 font-titulo text-[1.75rem]">{title}</h1>
          {subtitle && <p className="mt-1.5 text-[0.9rem] text-ink-3">{subtitle}</p>}
        </div>
        <SignOutButton />
      </header>
      {children}
    </main>
  );
}

export function AdminSection({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-superficie border border-linha bg-superficie p-6">
      {children}
    </section>
  );
}

export const adminClasses = {
  primaryButton:
    "inline-block cursor-pointer border-none bg-acento px-[1.4rem] py-3 font-titulo text-base text-sobre-acento no-underline rounded-pilula",
  dangerButton:
    "w-full cursor-pointer border-none bg-critico px-5 py-4 font-titulo text-[1.0625rem] text-sobre-acento rounded-pilula",
  primaryButtonSm:
    "inline-block cursor-pointer border-none bg-acento px-3 py-[0.45rem] font-titulo text-[0.8125rem] text-sobre-acento no-underline rounded-pilula",
  dangerButtonSm:
    "inline-block w-auto cursor-pointer border-none bg-critico px-3 py-[0.45rem] font-titulo text-[0.8125rem] text-sobre-acento rounded-pilula",
  secondaryButton:
    "inline-block cursor-pointer border border-linha bg-superficie-alta px-[1.4rem] py-3 font-titulo text-base text-ink no-underline rounded-pilula",
  listLink: "block border-b border-linha py-4 text-ink no-underline",
} as const;
