"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Glyph } from "./glyph";

const DIAS = ["D", "S", "T", "Q", "Q", "S", "S"];
const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function p2(n: number) {
  return String(n).padStart(2, "0");
}
/** Divide "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm" em partes. */
function parseValue(v: string): { date: string; time: string } {
  const [date = "", time = ""] = v.split("T");
  return { date, time };
}
function ymd(d: Date) {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}
function rotulo(v: string): string {
  const { date, time } = parseValue(v);
  const [y, m, d] = date.split("-");
  if (!y || !m || !d) return "";
  const base = `${d}/${m}/${y}`;
  return time ? `${base} · ${time}` : base;
}

/** Nosso seletor de data e hora — calendário próprio (nada do SO). A hora é
 *  opcional: nem todo evento tem horário fechado quando é criado. */
export function DateTimeField({
  value,
  onChange,
  label,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
  invalid?: boolean | undefined;
  describedBy?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const { date, time } = parseValue(value);

  const [visMes, setVisMes] = useState(() => {
    const base = date ? new Date(`${date}T00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

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

  const semanas = useMemo(() => {
    const primeiro = new Date(visMes.getFullYear(), visMes.getMonth(), 1);
    const inicio = new Date(primeiro);
    inicio.setDate(1 - primeiro.getDay());
    const dias: Date[] = [];
    for (let i = 0; i < 42; i++) {
      dias.push(new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i));
    }
    return dias;
  }, [visMes]);

  function escolherDia(d: Date) {
    onChange(time ? `${ymd(d)}T${time}` : ymd(d));
  }
  function definirHora(t: string) {
    if (!date) return;
    onChange(t ? `${date}T${t}` : date);
  }

  const hoje = new Date();
  const hojeStr = ymd(hoje);

  return (
    <div ref={wrapRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
        className={`flex min-h-[48px] w-full items-center justify-between gap-2 rounded-token border bg-superficie px-3.5 text-left transition-colors hover:border-acento-texto ${
          invalid ? "border-critico" : "border-linha"
        }`}
      >
        <span className={date ? "text-ink" : "text-ink-3"}>
          {date ? rotulo(value) : "Escolher data e hora"}
        </span>
        <span aria-hidden className="text-ink-3">
          <Glyph name="calendar" size={18} />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher data e hora"
          className="absolute left-0 top-full z-30 mt-2 w-[19rem] max-w-[90vw] rounded-superficie border border-linha bg-superficie p-3 shadow-alta"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Mês anterior"
              onClick={() => setVisMes((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
              className="grid size-8 place-items-center rounded-token text-ink-2 transition-colors hover:bg-superficie-alta hover:text-ink"
            >
              ‹
            </button>
            <span className="text-[0.9rem] font-medium capitalize text-ink">
              {MESES[visMes.getMonth()]} de {visMes.getFullYear()}
            </span>
            <button
              type="button"
              aria-label="Próximo mês"
              onClick={() => setVisMes((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
              className="grid size-8 place-items-center rounded-token text-ink-2 transition-colors hover:bg-superficie-alta hover:text-ink"
            >
              ›
            </button>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {DIAS.map((d, i) => (
              <span key={i} className="grid h-7 place-items-center tipo-label text-ink-3">
                {d}
              </span>
            ))}
            {semanas.map((d) => {
              const str = ymd(d);
              const outroMes = d.getMonth() !== visMes.getMonth();
              const sel = str === date;
              const ehHoje = str === hojeStr;
              return (
                <button
                  key={str}
                  type="button"
                  aria-pressed={sel}
                  aria-label={rotulo(str)}
                  onClick={() => escolherDia(d)}
                  className={`grid h-8 place-items-center rounded-token text-[0.85rem] tabular-nums transition-colors ${
                    sel
                      ? "bg-acento font-medium text-sobre-acento"
                      : outroMes
                        ? "text-ink-3 hover:bg-superficie-alta"
                        : "text-ink hover:bg-superficie-alta"
                  } ${ehHoje && !sel ? "ring-1 ring-inset ring-acento" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-linha pt-3">
            <span className="text-[0.85rem] text-ink-2">Horário</span>
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={time}
                disabled={!date}
                onChange={(e) => definirHora(e.target.value)}
                aria-label="Horário do evento"
                className="min-h-9 rounded-token border border-linha bg-bg px-2.5 text-ink outline-none focus-visible:border-acento-texto disabled:opacity-50"
              />
              {time && (
                <button
                  type="button"
                  onClick={() => definirHora("")}
                  className="tipo-label text-ink-3 transition-colors hover:text-ink"
                >
                  limpar
                </button>
              )}
            </div>
          </div>
          <p className="tipo-caption m-0 mt-1.5 text-ink-3">A hora é opcional — dá pra definir depois.</p>

          <div className="mt-3 flex items-center justify-between border-t border-linha pt-3">
            <button
              type="button"
              onClick={() => {
                escolherDia(hoje);
                setVisMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
              }}
              className="tipo-label text-acento-texto transition-opacity hover:opacity-80"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="tipo-label font-medium text-acento-texto transition-opacity hover:opacity-80"
            >
              Pronto
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
