"use client";

import Link from "next/link";
import {
  Estrela,
  IconeCamera,
  IconeGrade,
  IconePessoa,
  IconePilha,
} from "../../telas/pecas-de-tela";

type Aba = "feed" | "album" | "missoes" | "minhas";

function AbaLink({
  href,
  ligada,
  rotulo,
  icone,
  coluna,
}: {
  href: string;
  ligada: boolean;
  rotulo: string;
  icone: React.ReactNode;
  coluna: number;
}) {
  return (
    <Link
      href={href}
      style={{
        gridColumn: coluna,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
        fontSize: "0.5625rem",
        letterSpacing: "var(--tracking-rotulo)",
        textTransform: "uppercase",
        color: ligada ? "var(--acento)" : "var(--ink-3)",
        textDecoration: "none",
      }}
    >
      {icone}
      {rotulo}
    </Link>
  );
}

/**
 * Navegação do convidado — igual ao catálogo `/telas`.
 *
 * Feed · Missões · câmera · Álbum · Minhas. Música fica acessível pela rota
 * direta, fora da barra, até virar card na capa do evento.
 */
export function BarraDeAbasConvidado({ slug, ativa }: { slug: string; ativa?: Aba }) {
  const base = `/e/${encodeURIComponent(slug)}`;

  return (
    <nav
      style={{
        position: "fixed",
        insetInline: 0,
        bottom: 0,
        zIndex: 5,
        display: "grid",
        gridTemplateColumns: "1fr 1fr auto 1fr 1fr",
        alignItems: "center",
        padding: "0.625rem 0.75rem calc(1.625rem + env(safe-area-inset-bottom))",
        backgroundColor: "var(--bg)",
        borderTop: "1px solid var(--linha)",
      }}
    >
      <AbaLink
        coluna={1}
        href={`${base}/feed`}
        ligada={ativa === "feed"}
        rotulo="Feed"
        icone={<IconePilha />}
      />
      <AbaLink
        coluna={2}
        href={`${base}/foto`}
        ligada={ativa === "missoes"}
        rotulo="Missões"
        icone={<Estrela tamanho={22} />}
      />

      <Link
        href={`${base}/foto`}
        aria-label="Mandar foto ou vídeo"
        style={{
          gridColumn: 3,
          justifySelf: "center",
          display: "grid",
          placeItems: "center",
          width: "3.375rem",
          height: "3.375rem",
          borderRadius: "50%",
          backgroundColor: "var(--acento)",
          color: "var(--sobre-acento)",
          marginTop: "-1.25rem",
          boxShadow: "0 8px 20px -6px color-mix(in srgb, var(--acento) 70%, transparent)",
          textDecoration: "none",
        }}
      >
        <IconeCamera />
      </Link>

      <AbaLink
        coluna={4}
        href={`${base}/album`}
        ligada={ativa === "album"}
        rotulo="Álbum"
        icone={<IconeGrade />}
      />
      <AbaLink
        coluna={5}
        href={`${base}/minhas`}
        ligada={ativa === "minhas"}
        rotulo="Minhas"
        icone={<IconePessoa />}
      />
    </nav>
  );
}

/** Alias histórico — preferir o nome explícito em código novo. */
export const BarraDeAbas = BarraDeAbasConvidado;
