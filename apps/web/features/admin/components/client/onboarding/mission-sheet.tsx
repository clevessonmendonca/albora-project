"use client";

import React from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";
import { Glyph } from "./glyph";

export type MissionToggle = { key: string; label: string; on: boolean };

/**
 * Sheet de missões — desafios do pack que o anfitrião liga/desliga antes de
 * criar. Recebe os títulos já resolvidos pelo pack (nenhuma string de domínio
 * aqui); o wizard decide o que vai no POST a partir das que ficam ligadas.
 */
export function MissionSheet({
  open,
  onClose,
  missions,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  missions: MissionToggle[];
  onToggle: (key: string) => void;
}) {
  if (!open) return null;
  const ativas = missions.filter((m) => m.on).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Missões"
    >
      <div
        className="max-h-[85dvh] w-full max-w-[30rem] overflow-y-auto rounded-t-superficie bg-bg p-5 shadow-alta sm:rounded-superficie"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-pilula bg-linha sm:hidden" />
        <div className="mb-1 flex items-center justify-between">
          <h2 className="tipo-title m-0 text-[1.35rem]">Missões</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-8 place-items-center rounded-token bg-superficie-alta text-ink-2 transition-colors hover:text-ink"
          >
            <Glyph name="x" size={16} />
          </button>
        </div>
        <p className="tipo-caption m-0 mb-3 text-ink-3">
          Desafios que puxam a participação. Ligue ou desligue — {ativas} ativa
          {ativas === 1 ? "" : "s"}.
        </p>

        <div className="flex flex-col gap-2">
          {missions.map((m) => (
            <button
              key={m.key}
              type="button"
              role="switch"
              aria-checked={m.on}
              onClick={() => onToggle(m.key)}
              className={`flex items-center justify-between gap-3 rounded-token border p-3 text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                m.on
                  ? "border-acento bg-superficie-alta"
                  : "border-linha bg-superficie opacity-60 hover:opacity-100"
              }`}
            >
              <span className={`text-[0.9375rem] ${m.on ? "text-ink" : "text-ink-2"}`}>
                {m.label}
              </span>
              <span
                aria-hidden
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-pilula transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                  m.on ? "bg-acento" : "bg-linha"
                }`}
              >
                <span
                  className={`absolute top-0.5 size-5 rounded-full bg-bg shadow-suave transition-transform duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    m.on ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`${adminClasses.primaryButton} mt-4 w-full py-3 text-center`}
        >
          Pronto
        </button>
      </div>
    </div>
  );
}
