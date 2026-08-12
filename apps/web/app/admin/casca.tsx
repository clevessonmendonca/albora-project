import type { CSSProperties, ReactNode } from "react";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import Link from "next/link";
import { raio } from "../landing/pecas";
import { SairBotao } from "./sair-botao";

export function variaveisAdmin(): CSSProperties {
  return paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;
}

type CascaProps = {
  titulo: string;
  subtitulo?: string;
  voltar?: { rotulo: string; href: string };
  children: ReactNode;
};

/** Layout compartilhado do painel do anfitrião (spec 009). */
export function CascaAdmin({ titulo, subtitulo, voltar, children }: CascaProps) {
  return (
    <main
      style={{
        ...variaveisAdmin(),
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
          {voltar && (
            <Link
              href={voltar.href}
              style={{
                display: "inline-block",
                marginBottom: "0.75rem",
                fontSize: "0.875rem",
                color: "var(--ink-3)",
                textDecoration: "none",
              }}
            >
              ← {voltar.rotulo}
            </Link>
          )}
          <h1 style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.75rem" }}>
            {titulo}
          </h1>
          {subtitulo && (
            <p style={{ margin: "0.35rem 0 0", color: "var(--ink-3)", fontSize: "0.9rem" }}>
              {subtitulo}
            </p>
          )}
        </div>
        <SairBotao />
      </header>
      {children}
    </main>
  );
}

export function SecaoAdmin({ children }: { children: ReactNode }) {
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

export const estilosAdmin: {
  botaoPrimario: CSSProperties;
  botaoPerigo: CSSProperties;
  linkLista: CSSProperties;
} = {
  botaoPrimario: {
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
  botaoPerigo: {
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
  linkLista: {
    display: "block",
    padding: "1rem 0",
    color: "var(--ink)",
    textDecoration: "none",
    borderBottom: "1px solid var(--linha)",
  },
};
