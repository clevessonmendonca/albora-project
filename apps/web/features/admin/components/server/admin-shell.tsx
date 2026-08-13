import type { CSSProperties, ReactNode } from "react";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import Link from "next/link";
import { raio } from "@/app/landing/pecas";
import { SignOutButton } from "@/features/admin/components/client/sign-out-button";

export function adminVars(): CSSProperties {
  return paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;
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
      style={{
        ...adminVars(),
        minHeight: "100dvh",
        padding: "clamp(1.5rem, 5vw, 4rem)",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <div>
          {back && (
            <Link
              href={back.href}
              style={{
                display: "inline-block",
                marginBottom: "0.75rem",
                fontSize: "0.875rem",
                color: "var(--ink-3)",
                textDecoration: "none",
              }}
            >
              ← {back.label}
            </Link>
          )}
          <h1 style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.75rem" }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ margin: "0.35rem 0 0", color: "var(--ink-3)", fontSize: "0.9rem" }}>
              {subtitle}
            </p>
          )}
        </div>
        <SignOutButton />
      </header>
      {children}
    </main>
  );
}

export function AdminSection({ children }: { children: ReactNode }) {
  return (
    <section
      style={{
        padding: "1.5rem",
        backgroundColor: "var(--superficie)",
        border: "1px solid var(--linha)",
        ...raio("var(--raio-superficie)"),
      }}
    >
      {children}
    </section>
  );
}

export const adminStyles: {
  primaryButton: CSSProperties;
  dangerButton: CSSProperties;
  listLink: CSSProperties;
} = {
  primaryButton: {
    display: "inline-block",
    padding: "0.75rem 1.4rem",
    fontFamily: "var(--fonte-titulo)",
    fontSize: "1rem",
    color: "var(--sobre-acento)",
    backgroundColor: "var(--acento)",
    textDecoration: "none",
    border: "none",
    cursor: "pointer",
    ...raio("var(--raio-pilula)"),
  },
  dangerButton: {
    width: "100%",
    padding: "1rem 1.25rem",
    fontFamily: "var(--fonte-titulo)",
    fontSize: "1.0625rem",
    color: "var(--sobre-critico, var(--sobre-acento))",
    backgroundColor: "var(--critico)",
    border: "none",
    cursor: "pointer",
    ...raio("var(--raio-pilula)"),
  },
  listLink: {
    display: "block",
    padding: "1rem 0",
    color: "var(--ink)",
    textDecoration: "none",
    borderBottom: "1px solid var(--linha)",
  },
};
