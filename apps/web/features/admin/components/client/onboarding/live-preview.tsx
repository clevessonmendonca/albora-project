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
  layout: string;
  onEditTitle?: (value: string) => void;
  onPickCover?: () => void;
};

/** Prévia ao vivo, uma tela só (design-system-v3 §0.1 "show > explain"): a capa que
 *  o convidado vê, atualizando cor, foto e título na hora. Chrome do produto neutro;
 *  destaque em `--ev`/`--ev-2`. */
export function LivePreview({ data }: { data: LivePreviewData }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <p className="tipo-label self-start text-ink-3">Assim seus convidados veem</p>
      <GuestSurface data={data} />
      <p className="tipo-caption inline-flex items-center gap-1.5 text-ink-3">
        <Glyph name="eye" size={13} /> Prévia — muda enquanto você edita
      </p>
    </div>
  );
}

/** Capa: foto do anfitrião quando existe; senão uma foto de exemplo do tipo do
 *  evento; e só como último recurso o estado vazio honesto tingido com `--ev`. */
function Cover({ data, className }: { data: LivePreviewData; className?: string }) {
  const base = "group relative overflow-hidden bg-superficie-alta";
  const src = data.coverImage ?? data.coverFallback ?? null;
  const propria = Boolean(data.coverImage);
  if (src) {
    return (
      <button
        type="button"
        onClick={data.onPickCover}
        className={`${base} ${className ?? ""}`}
        aria-label={propria ? "Trocar a capa" : "Escolher a capa"}
      >
        <img src={src} alt="" className="h-full w-full object-cover" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-0 h-1"
          style={{ background: "var(--ev-2, var(--ev))" }}
        />
        <span className="scrim-foto absolute inset-0 flex items-end justify-center p-2 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="chip-sobre-foto inline-flex items-center gap-1 rounded-pilula px-2.5 py-1 tipo-label">
            <Glyph name="image" size={13} /> {propria ? "Trocar foto" : "Escolher a capa"}
          </span>
        </span>
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={data.onPickCover}
      className={`${base} flex flex-col items-center justify-center gap-1.5 text-ink-3 ${className ?? ""}`}
      style={{ background: "var(--ev-tint, var(--superficie-alta))" }}
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: "var(--ev, var(--acento))" }} />
      <Glyph name="image" size={22} />
      <span className="tipo-label">Escolher a capa</span>
    </button>
  );
}

function EditableTitle({ data, className }: { data: LivePreviewData; className?: string }) {
  const editable = Boolean(data.onEditTitle);
  return (
    <p
      className={`m-0 font-titulo leading-tight ${className ?? ""}`}
      style={{ color: "var(--ev, var(--acento-texto))" }}
      contentEditable={editable}
      suppressContentEditableWarning
      spellCheck={false}
      role={editable ? "textbox" : undefined}
      aria-label={editable ? "Nome do evento (prévia)" : undefined}
      onBlur={editable ? (e) => data.onEditTitle?.(e.currentTarget.textContent ?? "") : undefined}
    >
      {data.title}
    </p>
  );
}

function GuestSurface({ data }: { data: LivePreviewData }) {
  return (
    <div
      className="w-[248px] overflow-hidden rounded-[28px] border border-linha bg-bg font-corpo shadow-alta"
      style={data.vars}
    >
      <Cover data={data} className="aspect-[3/4] w-full" />
      <div className="flex flex-col gap-3 p-4">
        <div>
          <EditableTitle data={data} className="text-[1.35rem]" />
          <p className="tipo-caption m-0 mt-1 text-ink-2">{data.dateLabel || "Data do evento"}</p>
        </div>
        <button
          type="button"
          tabIndex={-1}
          className="inline-flex min-h-11 items-center justify-center rounded-pilula px-4 text-[0.9rem] font-medium"
          style={{ background: "var(--ev, var(--acento))", color: "var(--ev-on, var(--sobre-acento))" }}
        >
          {data.ctaLabel}
        </button>
        <div className="flex flex-wrap gap-1.5">
          {data.momentos.slice(0, 3).map((m) => (
            <span
              key={m}
              className="rounded-pilula px-2.5 py-1 text-[0.7rem]"
              style={{ background: "var(--ev-soft, var(--superficie-alta))", color: "var(--ev, var(--ink-2))" }}
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
