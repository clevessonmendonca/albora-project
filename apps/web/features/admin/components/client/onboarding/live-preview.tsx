"use client";

import React, { type CSSProperties } from "react";
import { Glyph } from "./glyph";

export type LivePreviewData = {
  vars: CSSProperties;
  title: string;
  dateLabel: string;
  ctaLabel: string;
  momentos: string[];
  coverImage?: string | null;
  /** Foto de exemplo da capa quando o anfitrião ainda não escolheu a dele. */
  coverFallback?: string | null;
  /** Chave do estilo escolhido — muda a composição da capa (posição, caixa, corpo). */
  layout: string;
  onEditTitle?: (value: string) => void;
  onPickCover?: () => void;
};

/** Prévia ao vivo, uma tela só (design-system-v3 §0.1 "show > explain"): a capa que
 *  o convidado vê, atualizando cor, foto, título e — o mais importante — a
 *  composição do estilo escolhido, na hora. */
export function LivePreview({ data }: { data: LivePreviewData }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="tipo-label self-start text-ink-3">Assim seus convidados veem</p>
      <GuestCover data={data} />
      <p className="tipo-caption inline-flex items-center gap-1.5 text-ink-3">
        <Glyph name="eye" size={13} /> Muda enquanto você edita
      </p>
    </div>
  );
}

/** Composição do título por estilo — é o que faz "trocar de estilo" virar uma
 *  mudança de verdade, não só de fonte. */
function styleLayout(layout: string): {
  align: string;
  titulo: string;
  data: string;
} {
  switch (layout) {
    case "minimal":
      return {
        align: "items-start text-left",
        titulo: "text-[1.3rem] font-corpo font-semibold tracking-tight",
        data: "tracking-[0.18em]",
      };
    case "contempo":
      return {
        align: "items-start text-left",
        titulo: "text-[1.15rem] font-corpo font-bold uppercase tracking-[0.08em]",
        data: "tracking-[0.22em]",
      };
    case "fotografico":
      return {
        align: "items-center text-center",
        titulo: "text-[1.2rem] font-titulo",
        data: "tracking-[0.2em]",
      };
    case "classic":
      return {
        align: "items-center text-center",
        titulo: "text-[1.5rem] font-titulo italic",
        data: "tracking-[0.2em]",
      };
    default: // editorial
      return {
        align: "items-start text-left",
        titulo: "text-[1.6rem] font-titulo",
        data: "tracking-[0.16em]",
      };
  }
}

function GuestCover({ data }: { data: LivePreviewData }) {
  const src = data.coverImage ?? data.coverFallback ?? null;
  const propria = Boolean(data.coverImage);
  const editable = Boolean(data.onEditTitle);
  const L = styleLayout(data.layout);

  return (
    <div
      className="w-[252px] rounded-[34px] border border-linha bg-bg p-2 font-corpo shadow-alta"
      style={data.vars}
    >
      <div className="overflow-hidden rounded-[26px] bg-bg">
        <div className="relative aspect-[4/5] w-full overflow-hidden bg-superficie-alta">
          {src ? (
            <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div
              className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-ink-3"
              style={{ background: "var(--ev-tint, var(--superficie-alta))" }}
            >
              <Glyph name="image" size={22} />
              <span className="tipo-label">Escolher a capa</span>
            </div>
          )}

          <span
            aria-hidden
            className="absolute inset-x-0 top-0 h-1"
            style={{ background: "var(--ev-2, var(--ev))" }}
          />
          {src && <span aria-hidden className="scrim-foto absolute inset-0" />}

          <button
            type="button"
            onClick={data.onPickCover}
            aria-label={propria ? "Trocar a capa" : "Escolher a capa"}
            className="chip-sobre-foto absolute right-2.5 top-2.5 z-[2] flex size-8 items-center justify-center rounded-full shadow-suave transition-transform hover:scale-105"
          >
            <Glyph name="image" size={15} />
          </button>

          <div className={`absolute inset-x-4 bottom-4 z-[1] flex flex-col gap-1.5 ${L.align}`}>
            <p
              className={`sobre-foto m-0 leading-[1.04] ${L.titulo}`}
              style={{ fontFamily: "var(--fonte-titulo, inherit)" }}
              contentEditable={editable}
              suppressContentEditableWarning
              spellCheck={false}
              role={editable ? "textbox" : undefined}
              aria-label={editable ? "Nome do evento (prévia)" : undefined}
              onBlur={editable ? (e) => data.onEditTitle?.(e.currentTarget.textContent ?? "") : undefined}
            >
              {data.title}
            </p>
            <p className={`sobre-foto m-0 text-[0.62rem] font-medium uppercase ${L.data}`}>
              {data.dateLabel || "Data do evento"}
            </p>
          </div>
        </div>

        <div className="px-4 py-3">
          <span
            className="flex min-h-10 items-center justify-center rounded-pilula text-[0.85rem] font-medium"
            style={{ background: "var(--ev, var(--acento))", color: "var(--ev-on, var(--sobre-acento))" }}
          >
            {data.ctaLabel}
          </span>
        </div>
      </div>

      <div className="flex justify-center py-1.5">
        <span aria-hidden className="h-1 w-16 rounded-full bg-linha" />
      </div>
    </div>
  );
}
