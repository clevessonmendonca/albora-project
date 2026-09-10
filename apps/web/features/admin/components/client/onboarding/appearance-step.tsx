"use client";

import React, { type CSSProperties } from "react";
import { eventColorVariables, eventOnContrast } from "@albora/tokens";
import { COLOR_COMBOS, EVENT_STYLES, SUGGESTED_COLORS, type EventStyle } from "./appearance-data";
import { Glyph } from "./glyph";

type Slot = "cor" | "cor2";

/** Como o nome do evento é tipografado no card de cada estilo — o mesmo contrato
 *  visual da capa: serif editorial, sans minimal/contempo (caixa alta), etc. */
function styleNameClass(chave: EventStyle["chave"]): string {
  switch (chave) {
    case "minimal":
      return "font-corpo font-semibold tracking-tight";
    case "contempo":
      return "font-corpo font-semibold uppercase tracking-wide text-[0.95rem]";
    case "classic":
      return "font-titulo italic";
    default:
      return "font-titulo";
  }
}

/** Botão de cor óbvio: um disco com a cor atual + rótulo + hex; tocar abre o
 *  seletor nativo (qualquer cor). O disco colorido é o que sinaliza "isto é
 *  editável" — sem ele, ninguém descobre que dá pra trocar. */
function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-token border border-linha bg-superficie p-2.5 transition-colors hover:border-acento-texto">
      <span
        className="relative size-10 shrink-0 rounded-full border border-linha shadow-suave"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
          aria-label={`Escolher a cor ${label.toLowerCase()}`}
        />
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
    </label>
  );
}

export function AppearanceStep({
  styleKey,
  onStyle,
  eventName,
  cor,
  cor2,
  onColor,
  photoColors,
}: {
  styleKey: EventStyle["chave"];
  onStyle: (s: EventStyle) => void;
  eventName: string;
  cor: string;
  cor2: string;
  onColor: (slot: Slot, hex: string) => void;
  photoColors: string[];
}) {
  const contraste = eventOnContrast(cor);
  const aaRuim = contraste !== null && contraste < 4.5;

  const sugestoes = [...photoColors, ...SUGGESTED_COLORS]
    .filter((c, i, arr) => arr.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i)
    .slice(0, 8);

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="m-0 border-0 p-0">
        <legend className="tipo-label mb-2.5 text-ink-3">Escolha um estilo</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {EVENT_STYLES.map((s) => {
            const ativo = s.chave === styleKey;
            const combo = COLOR_COMBOS[s.comboIndex]!;
            return (
              <button
                key={s.chave}
                type="button"
                role="radio"
                aria-checked={ativo}
                onClick={() => onStyle(s)}
                className={`relative flex flex-col overflow-hidden rounded-token text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                  ativo
                    ? "ring-2 ring-acento ring-offset-2 ring-offset-bg"
                    : "ring-1 ring-linha hover:ring-acento-texto"
                }`}
              >
                {ativo && (
                  <span
                    aria-hidden
                    className="absolute right-2 top-2 z-[2] flex size-5 items-center justify-center rounded-full bg-acento text-sobre-acento shadow-suave"
                  >
                    <Glyph name="check" size={13} />
                  </span>
                )}
                <span
                  aria-hidden
                  className="relative flex aspect-[4/3] items-end overflow-hidden"
                  style={{ background: combo.cor }}
                >
                  <span className="absolute inset-x-0 top-0 h-1.5" style={{ background: combo.cor2 }} />
                  <span
                    className={`sobre-foto relative z-[1] px-2.5 pb-2.5 leading-tight ${styleNameClass(
                      s.chave,
                    )}`}
                    style={{ fontFamily: s.camada.fontes?.titulo }}
                  >
                    {eventName}
                  </span>
                </span>
                <span
                  className={`flex flex-col gap-0.5 px-2.5 py-2 ${
                    ativo ? "bg-superficie-alta" : "bg-superficie"
                  }`}
                >
                  <span className="font-titulo text-[0.85rem] text-ink">{s.nome}</span>
                  <span className="tipo-label text-ink-3">{s.descricao}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-3 border-t border-linha pt-5">
        <div>
          <span className="text-sm font-medium text-ink">Cores do evento</span>
          <p className="tipo-caption m-0 mt-0.5 text-ink-3">
            O estilo já traz um par. Toque num disco pra escolher qualquer cor.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <ColorPicker label="Principal" value={cor} onChange={(v) => onColor("cor", v)} />
          <ColorPicker label="Detalhe" value={cor2} onChange={(v) => onColor("cor2", v)} />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="tipo-label mr-1 text-ink-3">Sugestões</span>
          {sugestoes.map((c) => {
            const sel = c.toLowerCase() === cor.toLowerCase();
            const daFoto = photoColors.some((p) => p.toLowerCase() === c.toLowerCase());
            return (
              <button
                key={c}
                type="button"
                aria-pressed={sel}
                aria-label={`Cor principal ${c}${daFoto ? " (da foto da capa)" : ""}`}
                title={daFoto ? "Da foto da capa" : c}
                onClick={() => onColor("cor", c)}
                className={`size-8 rounded-full transition-transform hover:scale-110 ${
                  sel ? "ring-2 ring-acento ring-offset-2 ring-offset-bg" : "border border-linha"
                }`}
                style={{ background: c }}
              />
            );
          })}
        </div>

        {aaRuim && (
          <span
            className="inline-flex w-fit items-center gap-1.5 rounded-pilula bg-critico/10 px-2.5 py-1 tipo-label text-critico"
            role="status"
          >
            <span aria-hidden className="size-1.5 rounded-full" style={{ background: "var(--critico)" }} />
            Contraste baixo — o texto sobre a cor principal pode ficar difícil de ler.
          </span>
        )}

        <details className="group mt-1">
          <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 tipo-label text-ink-3 transition-colors hover:text-ink">
            Ou use uma combinação pronta
            <span aria-hidden className="transition-transform group-open:rotate-180">
              ⌄
            </span>
          </summary>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {COLOR_COMBOS.map((c, i) => {
              const sel =
                c.cor.toLowerCase() === cor.toLowerCase() &&
                c.cor2.toLowerCase() === cor2.toLowerCase();
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={sel}
                  onClick={() => {
                    onColor("cor", c.cor);
                    onColor("cor2", c.cor2);
                  }}
                  className={`flex items-center gap-2 rounded-token border p-2 text-left transition-colors ${
                    sel
                      ? "border-acento bg-superficie-alta"
                      : "border-linha bg-superficie hover:border-acento-texto"
                  }`}
                >
                  <span className="flex shrink-0">
                    <span className="size-5 rounded-full border border-linha" style={{ background: c.cor }} />
                    <span className="-ml-2 size-5 rounded-full border border-linha" style={{ background: c.cor2 }} />
                  </span>
                  <span className="tipo-label truncate text-ink-2">{c.nome}</span>
                </button>
              );
            })}
          </div>
        </details>
      </div>
    </div>
  );
}

/** Vars de cor do evento a partir do par escolhido — para quem quiser aplicar `--ev` fora do
 *  resolvedor (ex.: um bloco isolado do preview). */
export function eventVarsFor(cor: string, cor2: string): CSSProperties {
  return eventColorVariables(cor, cor2) as CSSProperties;
}
