"use client";

import React, { useEffect, useRef, useState } from "react";
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
  customMissions,
  onAddCustom,
  onRemoveCustom,
}: {
  open: boolean;
  onClose: () => void;
  missions: MissionToggle[];
  onToggle: (key: string) => void;
  customMissions: string[];
  onAddCustom: (titulo: string) => void;
  onRemoveCustom: (index: number) => void;
}) {
  const [nova, setNova] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  // Esc fecha e o foco entra no painel ao abrir / volta ao gatilho ao fechar —
  // mesmo padrão dos popovers de cor e data; teclado-only não fica preso.
  useEffect(() => {
    if (!open) return;
    const anterior = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      anterior?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const ativas = missions.filter((m) => m.on).length + customMissions.length;

  function adicionar() {
    const t = nova.trim();
    if (!t) return;
    onAddCustom(t);
    setNova("");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Missões"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="max-h-[85dvh] w-full max-w-[30rem] overflow-y-auto rounded-t-superficie bg-bg p-5 shadow-alta outline-none sm:rounded-superficie"
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

        <div className="mt-4 flex flex-col gap-2">
          <span className="tipo-label text-ink-3">Suas missões</span>
          {customMissions.map((titulo, i) => (
            <div
              key={`${titulo}-${i}`}
              className="flex items-center justify-between gap-3 rounded-token border border-acento bg-superficie-alta p-3"
            >
              <span className="text-[0.9375rem] text-ink">{titulo}</span>
              <button
                type="button"
                onClick={() => onRemoveCustom(i)}
                aria-label={`Remover ${titulo}`}
                className="grid size-7 shrink-0 place-items-center rounded-full text-ink-3 transition-colors hover:text-critico"
              >
                <Glyph name="x" size={14} />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  adicionar();
                }
              }}
              maxLength={120}
              placeholder="Nova missão — ex.: Dançar com a vovó"
              aria-label="Nova missão"
              className="min-h-11 flex-1 rounded-token border border-linha bg-superficie px-3 py-2 text-ink outline-none transition-[border-color] focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
            />
            <button
              type="button"
              onClick={adicionar}
              disabled={!nova.trim()}
              className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-pilula border border-linha bg-superficie px-4 tipo-label text-ink transition-colors hover:border-acento-texto disabled:opacity-50"
            >
              <Glyph name="plus" size={14} /> Adicionar
            </button>
          </div>
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
