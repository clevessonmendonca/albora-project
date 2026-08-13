"use client";

import type { CSSProperties, ReactNode } from "react";
import { raio } from "../landing/pecas";
import { BarraDeStatus } from "./pecas-de-tela";

/**
 * Casco compartilhado das rotas do convidado — espelha `telas.tsx`.
 *
 * O catálogo `/telas` continua sendo a referência visual; estas peças são a
 * versão navegável que as rotas reais importam, para não duplicar padding,
 * tipografia e gestos do Instagram-in-evento.
 */

export const RODAPE_ABAS = "calc(6.5rem + env(safe-area-inset-bottom))";
export const PADDING_LATERAL = "1.125rem";

export function iniciaisDoAutor(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0]!.slice(0, 2).toUpperCase();
  return `${partes[0]![0] ?? ""}${partes[1]![0] ?? ""}`.toUpperCase();
}

export function ChaoConvidado({
  children,
  semStatus,
}: {
  children: ReactNode;
  semStatus?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
        lineHeight: 1.5,
      }}
    >
      {!semStatus && <BarraDeStatus />}
      {children}
    </div>
  );
}

export function MioloConvidado({
  children,
  comAbas = true,
}: {
  children: ReactNode;
  comAbas?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: `0 ${PADDING_LATERAL}`,
        paddingBottom: comAbas ? RODAPE_ABAS : "1.5rem",
      }}
    >
      {children}
    </div>
  );
}

export function CabecalhoConvidado({
  titulo,
  acao,
}: {
  titulo: string;
  acao?: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.375rem 0 0.875rem",
      }}
    >
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "1.125rem",
          letterSpacing: "var(--tracking-titulo)",
        }}
      >
        {titulo}
      </span>
      {acao}
    </div>
  );
}

export function RotuloEvento({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        fontSize: "0.6875rem",
        letterSpacing: "var(--tracking-rotulo)",
        textTransform: "uppercase",
        color: "var(--acento)",
      }}
    >
      {children}
    </p>
  );
}

export function TituloGrande({ children }: { children: ReactNode }) {
  return (
    <h1
      style={{
        margin: "0.875rem 0 0",
        fontFamily: "var(--fonte-titulo)",
        fontWeight: 300,
        fontSize: "clamp(1.75rem, 8vw, 2rem)",
        lineHeight: 1.1,
        letterSpacing: "var(--tracking-titulo)",
        textWrap: "balance",
      }}
    >
      {children}
    </h1>
  );
}

export function TextoSecundario({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: "0.875rem 0 0", fontSize: "0.9375rem", color: "var(--ink-2)" }}>
      {children}
    </p>
  );
}

/** Estado vazio compartilhado — spec A-09. Frase + atalho pra câmera. */
export function EstadoVazio({
  titulo,
  lede,
  caminhoDaCamera,
  rotuloCamera = "Tirar foto",
}: {
  titulo: string;
  lede: string;
  caminhoDaCamera: string;
  rotuloCamera?: string;
}) {
  return (
    <div
      style={{
        padding: "calc(var(--espaco) * 8) 0",
        textAlign: "center",
        display: "grid",
        gap: "1.25rem",
      }}
    >
      <div>
        <p
          style={{
            margin: "0 0 0.4rem",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.6rem",
            fontWeight: 500,
            lineHeight: 1.25,
            letterSpacing: "var(--tracking-titulo)",
            textWrap: "balance",
          }}
        >
          {titulo}
        </p>
        <p style={{ margin: 0, lineHeight: 1.6, color: "var(--ink-2)" }}>{lede}</p>
      </div>
      <a
        href={caminhoDaCamera}
        style={{
          display: "grid",
          placeItems: "center",
          width: "100%",
          padding: "1.125rem",
          textDecoration: "none",
          fontWeight: 600,
          ...raio("var(--raio-pilula)"),
          backgroundColor: "var(--acento)",
          color: "var(--sobre-acento)",
        }}
      >
        {rotuloCamera}
      </a>
    </div>
  );
}

/** Bottom-sheet compartilhado — spec A-05/A-06/A-07. */
export function SheetBaixo({
  titulo,
  aberto,
  onFechar,
  children,
  rodape,
  idTitulo,
}: {
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  idTitulo?: string;
}) {
  if (!aberto) return null;

  const tituloId = idTitulo ?? "sheet-titulo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 35,
        display: "grid",
        placeItems: "end center",
        padding: "1rem",
        paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
        background: "color-mix(in srgb, var(--noite) 45%, transparent)",
      }}
      onClick={onFechar}
    >
      <div
        style={{
          width: "min(26rem, 100%)",
          maxHeight: "min(78dvh, 32rem)",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          overflow: "hidden",
          padding: "1.25rem",
          gap: "0.875rem",
          ...raio("var(--raio-superficie)"),
          backgroundColor: "var(--superficie)",
          border: "1px solid var(--linha)",
        }}
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2
          id={tituloId}
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.0625rem",
            fontWeight: 400,
          }}
        >
          {titulo}
        </h2>
        <div style={{ overflow: "auto", minHeight: 0 }}>{children}</div>
        {rodape}
      </div>
    </div>
  );
}

export function AvisoGate({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
        padding: "0.875rem 1rem",
        marginBottom: "1rem",
        ...raio("var(--raio)"),
        backgroundColor: "var(--superficie)",
      }}
    >
      <span
        className="pulso"
        style={{
          marginTop: "0.375rem",
          width: "0.4375rem",
          height: "0.4375rem",
          borderRadius: "50%",
          backgroundColor: "var(--acento)",
          flex: "none",
        }}
      />
      <span style={{ fontSize: "0.8125rem", lineHeight: 1.45, color: "var(--ink-2)" }}>
        {children}
      </span>
    </div>
  );
}

/** Missão sobre o visor — igual a `TelaCamera` em `/telas`. */
export function FaixaMissao({
  indice,
  total,
  titulo,
}: {
  indice: number;
  total: number;
  titulo: string;
}) {
  return (
    <div
      style={{
        padding: "0.875rem 1rem",
        ...raio("var(--raio)"),
        backgroundColor: "color-mix(in srgb, var(--acento) 92%, transparent)",
        color: "var(--sobre-acento)",
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.5625rem",
          letterSpacing: "var(--tracking-rotulo)",
          textTransform: "uppercase",
          opacity: 0.75,
        }}
      >
        Missão {String(indice).padStart(2, "0")} de {String(total).padStart(2, "0")}
      </p>
      <p
        style={{
          margin: "0.3125rem 0 0",
          fontFamily: "var(--fonte-titulo)",
          fontSize: "1.0625rem",
          lineHeight: 1.2,
        }}
      >
        {titulo}
      </p>
    </div>
  );
}

export function AvatarAutor({ nome }: { nome: string }) {
  return (
    <span
      style={{
        display: "grid",
        placeItems: "center",
        width: "1.875rem",
        height: "1.875rem",
        borderRadius: "50%",
        backgroundColor: "var(--superficie-alta)",
        fontSize: "0.75rem",
        flex: "none",
      }}
    >
      {iniciaisDoAutor(nome)}
    </span>
  );
}

export function CabecalhoPublicacao({
  autor,
  meta,
}: {
  autor: string;
  meta?: string | null;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.25rem 0" }}>
      <AvatarAutor nome={autor} />
      <span style={{ flex: 1, fontSize: "0.84375rem" }}>{autor}</span>
      {meta && (
        <span style={{ fontSize: "0.6875rem", color: "var(--ink-3)" }}>{meta}</span>
      )}
    </div>
  );
}

export function BotaoPrimario({
  children,
  onClick,
  desabilitado,
  tipo = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  desabilitado?: boolean;
  tipo?: "button" | "submit";
}) {
  return (
    <button
      type={tipo}
      disabled={desabilitado}
      onClick={onClick}
      style={{
        display: "grid",
        placeItems: "center",
        width: "100%",
        padding: "1.125rem",
        border: "none",
        cursor: desabilitado ? "default" : "pointer",
        opacity: desabilitado ? 0.55 : 1,
        font: "inherit",
        fontWeight: 600,
        ...raio("var(--raio-pilula)"),
        backgroundColor: "var(--acento)",
        color: "var(--sobre-acento)",
      }}
    >
      {children}
    </button>
  );
}

export function BotaoSecundario({
  children,
  onClick,
  desabilitado,
  tipo = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  desabilitado?: boolean;
  tipo?: "button" | "submit";
}) {
  return (
    <button
      type={tipo}
      disabled={desabilitado}
      onClick={onClick}
      style={{
        display: "grid",
        placeItems: "center",
        width: "100%",
        padding: "0.9375rem",
        cursor: desabilitado ? "default" : "pointer",
        opacity: desabilitado ? 0.55 : 1,
        font: "inherit",
        fontWeight: 400,
        ...raio("var(--raio-pilula)"),
        backgroundColor: "transparent",
        color: "var(--ink-2)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "var(--linha)",
      }}
    >
      {children}
    </button>
  );
}

export function CampoNome({
  valor,
  onChange,
  placeholder,
}: {
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={valor}
      onChange={(ev) => onChange(ev.target.value)}
      placeholder={placeholder}
      maxLength={40}
      required
      autoComplete="given-name"
      enterKeyHint="go"
      style={{
        width: "100%",
        padding: "1.0625rem 1.125rem",
        ...raio("var(--raio)"),
        backgroundColor: "var(--superficie)",
        border: "none",
        borderBottomWidth: "2px",
        borderBottomStyle: "solid",
        borderBottomColor: "var(--acento)",
        fontFamily: "var(--fonte-titulo)",
        fontSize: "1.375rem",
        color: "var(--ink)",
        outline: "none",
      } as CSSProperties}
    />
  );
}

export function Consentimento({
  marcado,
  onChange,
  children,
}: {
  marcado: boolean;
  onChange?: (valor: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        gap: "0.75rem",
        alignItems: "flex-start",
        cursor: onChange ? "pointer" : "default",
      }}
    >
      <input
        type="checkbox"
        checked={marcado}
        readOnly={!onChange}
        onChange={onChange ? (ev) => onChange(ev.target.checked) : undefined}
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          flex: "none",
          display: "grid",
          placeItems: "center",
          width: "1.375rem",
          height: "1.375rem",
          ...raio("0.4375rem"),
          backgroundColor: marcado ? "var(--acento)" : "transparent",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: marcado ? "var(--acento)" : "var(--linha)",
          color: "var(--sobre-acento)",
          fontSize: "0.8125rem",
        }}
      >
        {marcado ? "✓" : ""}
      </span>
      <span style={{ fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
        {children}
      </span>
    </label>
  );
}

export function ColunaEntrada({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "1.75rem",
        padding: "0 1.75rem 3rem",
        maxWidth: "26rem",
        width: "100%",
        margin: "0 auto",
      }}
    >
      {children}
    </div>
  );
}

const estiloLinkDiscreto: CSSProperties = {
  padding: 0,
  border: "none",
  background: "none",
  font: "inherit",
  fontSize: "inherit",
  lineHeight: "inherit",
  color: "var(--acento)",
  textDecoration: "underline",
  textUnderlineOffset: "0.15em",
};

export function LinkDiscreto({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  if (!onClick) {
    return <span style={estiloLinkDiscreto}>{children}</span>;
  }

  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onClick();
      }}
      style={{ ...estiloLinkDiscreto, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

export function RecadoConsentimento({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        padding: "0.875rem 1rem",
        ...raio("var(--raio)"),
        backgroundColor: "var(--superficie)",
        fontSize: "0.8125rem",
        lineHeight: 1.55,
        color: "var(--ink-2)",
      }}
    >
      {children}
    </p>
  );
}

export function RecadoErro({ children }: { children: ReactNode }) {
  return (
    <p role="alert" style={{ margin: "0.75rem 0 0", fontSize: "0.85rem", color: "var(--critico)" }}>
      {children}
    </p>
  );
}

export function RodapeDiscreto({ children }: { children: ReactNode }) {
  return (
    <p
      style={{
        margin: 0,
        textAlign: "center",
        fontSize: "0.75rem",
        color: "var(--ink-3)",
      }}
    >
      {children}
    </p>
  );
}
