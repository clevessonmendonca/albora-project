"use client";

import React, { useEffect, useId, useMemo, useState, type CSSProperties } from "react";
import { Glyph } from "./glyph";

export type PreviewSurface = "convidado" | "telao" | "album";

const SURFACES: { chave: PreviewSurface; rotulo: string }[] = [
  { chave: "convidado", rotulo: "Convidado" },
  { chave: "telao", rotulo: "Telão" },
  { chave: "album", rotulo: "Álbum" },
];

export type LivePreviewData = {
  vars: CSSProperties;
  title: string;
  dateLabel: string;
  ctaLabel: string;
  momentos: string[];
  coverImage?: string | null;
  /** Foto de exemplo da capa quando o anfitrião ainda não escolheu a dele. */
  coverFallback?: string | null;
  /** Fotos de exemplo do telão e do álbum. */
  gallery?: readonly string[];
  layout: string;
  onEditTitle?: (value: string) => void;
  onPickCover?: () => void;
};

/** Preview ao vivo persistente (design-system-v3 §0.1 "show > explain"). Três superfícies do mesmo
 *  evento; cor/foto/título atualizam na hora. Chrome do produto neutro; destaque em `--ev`/`--ev-2`
 *  (as duas camadas). Sem foto falsa: capa vazia é estado honesto, não gradiente fingindo foto. */
export function LivePreview({
  data,
  surface: controlled,
  onSurfaceChange,
}: {
  data: LivePreviewData;
  surface?: PreviewSurface;
  onSurfaceChange?: (s: PreviewSurface) => void;
}) {
  const [internal, setInternal] = useState<PreviewSurface>("convidado");
  const surface = controlled ?? internal;
  const setSurface = (s: PreviewSurface) => {
    setInternal(s);
    onSurfaceChange?.(s);
  };
  const tablistId = useId();

  return (
    <div className="flex flex-col gap-3">
      <div
        role="tablist"
        aria-label="Superfície da prévia"
        className="flex gap-1 self-center rounded-pilula border border-linha bg-superficie p-0.5"
      >
        {SURFACES.map((s) => {
          const ativo = surface === s.chave;
          return (
            <button
              key={s.chave}
              role="tab"
              id={`${tablistId}-${s.chave}`}
              aria-selected={ativo}
              type="button"
              onClick={() => setSurface(s.chave)}
              className={`inline-flex min-h-9 items-center justify-center rounded-pilula px-3.5 text-[0.8rem] transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                ativo ? "bg-superficie-alta text-ink shadow-suave" : "text-ink-3 hover:text-ink-2"
              }`}
            >
              {s.rotulo}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-labelledby={`${tablistId}-${surface}`}
        className="grid place-items-center"
      >
        {surface === "convidado" && <GuestSurface data={data} />}
        {surface === "telao" && <WallSurface data={data} />}
        {surface === "album" && <AlbumSurface data={data} />}
      </div>
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

function EditableTitle({
  data,
  className,
}: {
  data: LivePreviewData;
  className?: string;
}) {
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

/** Telão ao vivo: as fotos de exemplo trocam sozinhas (respeitando reduce-motion),
 *  como o mural do salão preenchendo durante a festa. */
function WallSurface({ data }: { data: LivePreviewData }) {
  const pool = useMemo(() => data.gallery ?? [], [data.gallery]);
  const [cells, setCells] = useState<string[]>(() =>
    Array.from({ length: 6 }, (_, i) => (pool.length ? pool[i % pool.length]! : "")),
  );

  useEffect(() => {
    if (pool.length < 2) return;
    const reduz =
      typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduz) return;
    const id = setInterval(() => {
      setCells((prev) => {
        const next = [...prev];
        const i = Math.floor(Math.random() * next.length);
        next[i] = pool[Math.floor(Math.random() * pool.length)] ?? next[i]!;
        return next;
      });
    }, 1800);
    return () => clearInterval(id);
  }, [pool]);

  return (
    <div
      className="w-full max-w-[340px] overflow-hidden rounded-superficie border border-linha bg-bg font-corpo shadow-alta"
      style={data.vars}
    >
      <div className="flex items-center justify-between border-b border-linha px-4 py-3">
        <EditableTitle data={data} className="text-[1.05rem]" />
        <span className="inline-flex items-center gap-1.5 tipo-label text-ink-2">
          <span aria-hidden className="size-2 rounded-full" style={{ background: "var(--ev, var(--acento))" }} />
          ao vivo
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1.5 p-3">
        {cells.map((src, i) => (
          <span
            key={i}
            aria-hidden
            className="aspect-[3/4] overflow-hidden rounded-token bg-superficie-alta"
          >
            {src ? (
              <img
                key={src}
                src={src}
                alt=""
                className="h-full w-full animate-[wall-aparecer_550ms_var(--curva)] object-cover motion-reduce:animate-none"
              />
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function AlbumSurface({ data }: { data: LivePreviewData }) {
  const pool = data.gallery ?? [];
  return (
    <div
      className="w-[248px] overflow-hidden rounded-[28px] border border-linha bg-bg font-corpo shadow-alta"
      style={data.vars}
    >
      <div className="flex items-center justify-between px-4 pt-4">
        <EditableTitle data={data} className="text-[1.05rem]" />
        <span aria-hidden className="text-ink-3"><Glyph name="image" size={16} /></span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-3">
        {Array.from({ length: 6 }).map((_, i) => {
          const src = pool.length ? pool[(i + 2) % pool.length]! : "";
          return (
            <span
              key={i}
              aria-hidden
              className={`overflow-hidden rounded-token bg-superficie-alta ${
                i % 3 === 0 ? "row-span-2 aspect-[3/4]" : "aspect-square"
              }`}
            >
              {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : null}
            </span>
          );
        })}
      </div>
    </div>
  );
}
