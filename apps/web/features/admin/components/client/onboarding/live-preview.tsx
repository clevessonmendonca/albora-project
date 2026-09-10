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

/** Prévia ao vivo, uma tela só: a capa que o convidado vê, atualizando cor, foto,
 *  título e a composição do estilo — na hora. */
export function LivePreview({ data }: { data: LivePreviewData }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <p className="tipo-label self-start text-ink-3">Assim seus convidados veem</p>
      <GuestCover data={data} />
    </div>
  );
}

/** Composição do título por estilo — é o que faz "trocar de estilo" virar uma
 *  mudança de verdade, não só de fonte. */
function styleLayout(layout: string): { align: string; titulo: string; data: string } {
  switch (layout) {
    case "minimal":
      return {
        align: "items-start text-left",
        titulo: "text-[1.35rem] font-corpo font-semibold tracking-tight",
        data: "tracking-[0.18em]",
      };
    case "contempo":
      return {
        align: "items-start text-left",
        titulo: "text-[1.2rem] font-corpo font-bold uppercase tracking-[0.08em]",
        data: "tracking-[0.22em]",
      };
    case "fotografico":
      return {
        align: "items-center text-center",
        titulo: "text-[1.3rem] font-titulo",
        data: "tracking-[0.2em]",
      };
    case "classic":
      return {
        align: "items-center text-center",
        titulo: "text-[1.6rem] font-titulo italic",
        data: "tracking-[0.2em]",
      };
    default: // editorial
      return {
        align: "items-start text-left",
        titulo: "text-[1.7rem] font-titulo",
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
      className="w-[248px] rounded-[36px] border border-linha bg-bg p-2 font-corpo shadow-alta"
      style={data.vars}
    >
      {/* Tela inteira do celular — a foto ocupa 100%. */}
      <div className="relative aspect-[9/19] w-full overflow-hidden rounded-[28px] bg-superficie-alta">
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
          className="chip-sobre-foto absolute right-3 top-3 z-[2] flex size-8 items-center justify-center rounded-full shadow-suave transition-transform hover:scale-105"
        >
          <Glyph name="image" size={15} />
        </button>

        <div className="absolute inset-x-4 bottom-5 z-[1] flex flex-col gap-3">
          <div className={`flex flex-col gap-1.5 ${L.align}`}>
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

          {/* CTA translúcido sobre a foto — deixa a imagem respirar por baixo. */}
          <span
            className="flex min-h-11 items-center justify-center rounded-pilula border border-white/30 text-[0.9rem] font-medium text-white"
            style={{ background: "color-mix(in srgb, var(--ev, var(--acento)) 72%, transparent)" }}
          >
            {data.ctaLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
