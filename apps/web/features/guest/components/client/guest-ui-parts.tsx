"use client";

import type { CSSProperties, ReactNode } from "react";
import { raio } from "@/app/landing/pecas";

/** A barra de status, para a tela caber no aparelho sem parecer recortada. */
export function BarraDeStatus({ claro }: { claro?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0.875rem 1.625rem 0.375rem",
        fontSize: "0.8125rem",
        fontWeight: 600,
        color: claro ? "var(--ink)" : "var(--ink)",
      }}
    >
      <span>23:41</span>
      <span style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
        {[0.55, 0.75, 1].map((h) => (
          <span
            key={h}
            style={{
              width: "0.1875rem",
              height: `${h * 0.75}rem`,
              backgroundColor: "currentColor",
            }}
          />
        ))}
        <span
          style={{
            marginLeft: "0.3125rem",
            width: "1.375rem",
            height: "0.6875rem",
            ...raio("0.25rem"),
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "currentColor",
            padding: "0.0625rem",
          }}
        >
          <span style={{ display: "block", width: "70%", height: "100%", backgroundColor: "currentColor" }} />
        </span>
      </span>
    </div>
  );
}

/**
 * A estrela da marca no lugar do coração.
 *
 * Reação é mecânica do Instagram e funciona; o coração é anti-padrão listado
 * no `CLAUDE.md`, junto com aliança e pombinha. A estrela já é da marca, então
 * o gesto continua consolidado e o símbolo deixa de ser clichê de casamento.
 */
export function Estrela({ tamanho = 24, cheia }: { tamanho?: number; cheia?: boolean }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.5c.35 4.6 4.55 8.8 9.15 9.15v.7C16.55 12.7 12.35 16.9 12 21.5h-.7C10.95 16.9 6.75 12.7 2.15 12.35v-.7C6.75 11.3 10.95 7.1 11.3 2.5Z"
        fill={cheia ? "var(--acento)" : "none"}
        stroke="currentColor"
        strokeWidth={cheia ? 0 : 1.5}
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconeGrade({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      {[
        [3, 3],
        [14, 3],
        [3, 14],
        [14, 14],
      ].map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

export function IconePilha({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <rect x="3" y="6" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.5 6V4.5A1.5 1.5 0 0 1 8 3h8a1.5 1.5 0 0 1 1.5 1.5V6" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconePessoa({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <circle cx="12" cy="8" r="3.75" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4.5 20.5c1.2-3.9 4-5.9 7.5-5.9s6.3 2 7.5 5.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconeCamera({ tamanho = 26 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M3 8.5A2.5 2.5 0 0 1 5.5 6h1.7l1.1-1.8A1.5 1.5 0 0 1 9.6 3.5h4.8a1.5 1.5 0 0 1 1.3.7L16.8 6h1.7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.75" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function IconeComentario({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M21 11.6c0 4.2-4 7.6-9 7.6-1 0-2-.14-2.9-.4L4 20.5l1.4-3.7C4.2 15.4 3.5 13.6 3.5 11.6 3.5 7.4 7.5 4 12.5 4S21 7.4 21 11.6Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * A barra de abas.
 *
 * Quatro abas e a câmera no meio, que é a forma que o Instagram consolidou e
 * que a dots repete. O que muda é o conteúdo: não há aba de planejamento
 * (fase 4) nem de conversa — comentário mora na foto, não numa caixa de
 * mensagens paralela.
 */
export function TabBarPreview({ ativa }: { ativa: "feed" | "missoes" | "minhas" | "album" }) {
  const abas = [
    { id: "feed", rotulo: "Feed", icone: <IconePilha /> },
    { id: "missoes", rotulo: "Missões", icone: <Estrela tamanho={22} /> },
    { id: "album", rotulo: "Álbum", icone: <IconeGrade /> },
    { id: "minhas", rotulo: "Minhas", icone: <IconePessoa /> },
  ] as const;

  return (
    <nav
      style={{
        position: "relative",
        display: "grid",
        gridTemplateColumns: "1fr 1fr auto 1fr 1fr",
        alignItems: "center",
        padding: "0.625rem 0.75rem 1.625rem",
        backgroundColor: "var(--bg)",
        borderTopWidth: "1px",
        borderTopStyle: "solid",
        borderTopColor: "var(--linha)",
      }}
    >
      {abas.map((aba, i) => (
        <span
          key={aba.id}
          style={{
            gridColumn: i < 2 ? i + 1 : i + 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.25rem",
            fontSize: "0.5625rem",
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
            color: aba.id === ativa ? "var(--acento)" : "var(--ink-3)",
          }}
        >
          {aba.icone}
          {aba.rotulo}
        </span>
      ))}

      <span
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
        }}
      >
        <IconeCamera />
      </span>
    </nav>
  );
}

/**
 * Compartilhar para fora.
 *
 * A seta que sai da caixa é o desenho que iOS e Android já ensinaram; o
 * convidado não precisa aprender símbolo novo para mandar a foto para onde
 * ele já conversa.
 */
export function IconeCompartilhar({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="M12 3.5v11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="m8.25 7.25 3.75-3.75 3.75 3.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 11.5H5.5A1.5 1.5 0 0 0 4 13v6.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V13a1.5 1.5 0 0 0-1.5-1.5H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconeMais({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true">
      {[6, 12, 18].map((x) => (
        <circle key={x} cx={x} cy="12" r="1.6" fill="currentColor" />
      ))}
    </svg>
  );
}

export function IconeVoltar({ tamanho = 20 }: { tamanho?: number }) {
  return (
    <svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path d="m14.5 5-7 7 7 7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Botão redondo sobre a foto do topo. */
export function BotaoFlutuante({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: "2.25rem",
        height: "2.25rem",
        borderRadius: "50%",
        backgroundColor: "color-mix(in srgb, var(--bg) 72%, transparent)",
        color: "var(--ink)",
      }}
    >
      {children}
    </span>
  );
}

export function Pilula({
  children,
  ativa,
  style,
}: {
  children: ReactNode;
  ativa?: boolean;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.375rem",
        padding: "0.4375rem 0.875rem",
        ...raio("var(--raio-pilula)"),
        backgroundColor: ativa ? "var(--acento)" : "var(--superficie-alta)",
        color: ativa ? "var(--sobre-acento)" : "var(--ink-2)",
        fontSize: "0.78125rem",
        whiteSpace: "nowrap",
        ...style,
      }}
    >
      {children}
    </span>
  );
}
