"use client";

import React, { useEffect, useRef, useState } from "react";
import { Glyph } from "./glyph";

/* ---------- conversões cor ---------- */
function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function normalizeHex(hex: string): string | null {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return /^[0-9a-fA-F]{6}$/.test(h) ? `#${h.toLowerCase()}` : null;
}
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const n = normalizeHex(hex) ?? "#000000";
  const r = parseInt(n.slice(1, 3), 16) / 255;
  const g = parseInt(n.slice(3, 5), 16) / 255;
  const b = parseInt(n.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max };
}
function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Campo de cor com nosso próprio seletor — disco colorido que abre um popover
 *  (área saturação/valor + matiz + hex + sugestões). Sem o seletor nativo do SO. */
export function ColorField({
  label,
  value,
  onChange,
  swatches = [],
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  swatches?: readonly string[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-token border border-linha bg-superficie p-2.5 text-left transition-colors hover:border-acento-texto"
      >
        <span
          className="relative size-10 shrink-0 rounded-full border border-linha shadow-suave"
          style={{ background: value }}
        >
          <span
            aria-hidden
            className="chip-sobre-foto absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full shadow-suave"
          >
            <Glyph name="plus" size={10} />
          </span>
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="text-[0.85rem] font-medium text-ink">{label}</span>
          <span className="tipo-label uppercase tracking-wide text-ink-3">{value}</span>
        </span>
      </button>

      {open && (
        <ColorPopover value={value} onChange={onChange} swatches={swatches} />
      )}
    </div>
  );
}

function ColorPopover({
  value,
  onChange,
  swatches,
}: {
  value: string;
  onChange: (hex: string) => void;
  swatches: readonly string[];
}) {
  const { h, s, v } = hexToHsv(value);
  const [hex, setHex] = useState(value);
  const svRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHex(value), [value]);

  function emitHsv(nh: number, ns: number, nv: number) {
    onChange(hsvToHex(nh, clamp(ns, 0, 1), clamp(nv, 0, 1)));
  }

  function pointFromEvent(e: React.PointerEvent) {
    const el = svRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ns = clamp((e.clientX - r.left) / r.width, 0, 1);
    const nv = 1 - clamp((e.clientY - r.top) / r.height, 0, 1);
    emitHsv(h, ns, nv);
  }

  return (
    <div
      role="dialog"
      aria-label="Escolher cor"
      className="absolute left-0 top-full z-30 mt-2 w-64 rounded-superficie border border-linha bg-superficie p-3 shadow-alta"
    >
      {/* Saturação × valor */}
      <div
        ref={svRef}
        className="relative h-32 w-full cursor-crosshair touch-none rounded-token"
        style={{ background: hsvToHex(h, 1, 1) }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          pointFromEvent(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) pointFromEvent(e);
        }}
      >
        <span
          aria-hidden
          className="absolute inset-0 rounded-token"
          style={{ background: "linear-gradient(to right, #fff, transparent)" }}
        />
        <span
          aria-hidden
          className="absolute inset-0 rounded-token"
          style={{ background: "linear-gradient(to top, #000, transparent)" }}
        />
        <span
          aria-hidden
          className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-suave"
          style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: value }}
        />
      </div>

      {/* Matiz */}
      <input
        type="range"
        min={0}
        max={360}
        value={Math.round(h)}
        onChange={(e) => emitHsv(Number(e.target.value), s || 1, v || 1)}
        aria-label="Matiz"
        className="mt-3 h-3 w-full cursor-pointer appearance-none rounded-pilula"
        style={{
          background:
            "linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
        }}
      />

      {/* Hex + sugestões */}
      <div className="mt-3 flex items-center gap-2">
        <span className="size-6 shrink-0 rounded-full border border-linha" style={{ background: value }} />
        <input
          value={hex}
          onChange={(e) => {
            setHex(e.target.value);
            const n = normalizeHex(e.target.value);
            if (n) onChange(n);
          }}
          spellCheck={false}
          aria-label="Código hex da cor"
          className="min-h-9 w-full rounded-token border border-linha bg-bg px-2.5 font-mono text-[0.8rem] uppercase text-ink outline-none focus-visible:border-acento-texto"
        />
      </div>

      {swatches.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {swatches.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={c}
              title={c}
              onClick={() => onChange(c)}
              className="size-6 rounded-full border border-linha transition-transform hover:scale-110"
              style={{ background: c }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
