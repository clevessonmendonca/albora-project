"use client";

import React, { useState, type CSSProperties } from "react";
import { eventColorVariables, eventOnContrast } from "@albora/tokens";
import { COLOR_COMBOS, EVENT_STYLES, SUGGESTED_COLORS, type EventStyle } from "./appearance-data";

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

export function AppearanceStep({
  styleKey,
  onStyle,
  eventName,
  cor,
  cor2,
  onColor,
  photoColors,
  hasCover,
}: {
  styleKey: EventStyle["chave"];
  onStyle: (s: EventStyle) => void;
  eventName: string;
  cor: string;
  cor2: string;
  onColor: (slot: Slot, hex: string) => void;
  photoColors: string[];
  hasCover: boolean;
}) {
  // Cor aberta por padrão: escolher qualquer cor (input nativo) é caminho de
  // primeira classe, não um "avançado" escondido atrás de um toggle.
  const [personalizar, setPersonalizar] = useState(true);
  const [slot, setSlot] = useState<Slot>("cor");
  const ativa = slot === "cor" ? cor : cor2;
  const contraste = eventOnContrast(cor);
  const aaOk = contraste !== null && contraste >= 4.5;

  const paleta = [...photoColors, ...SUGGESTED_COLORS].filter(
    (c, i, arr) => arr.findIndex((x) => x.toLowerCase() === c.toLowerCase()) === i,
  ).slice(0, 8);

  return (
    <div className="flex flex-col gap-5">
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
                className={`flex flex-col overflow-hidden rounded-token text-left transition-all duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                  ativo ? "border-2 border-acento" : "border border-linha hover:border-acento-texto"
                }`}
              >
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
                <span className="flex flex-col gap-0.5 bg-superficie px-2.5 py-2">
                  <span className="font-titulo text-[0.85rem] text-ink">{s.nome}</span>
                  <span className="tipo-label text-ink-3">{s.descricao}</span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="border-t border-linha pt-1">
        <button
          type="button"
          onClick={() => setPersonalizar((v) => !v)}
          aria-expanded={personalizar}
          className="inline-flex min-h-11 items-center gap-1.5 text-[0.85rem] text-ink-3 transition-colors hover:text-ink"
        >
          {personalizar ? "Ocultar" : "Personalizar cores"}
          <span aria-hidden className={personalizar ? "rotate-180 transition-transform" : "transition-transform"}>
            ⌄
          </span>
        </button>
      </div>

      {personalizar && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <span className="tipo-label text-ink-3">Combinações</span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {COLOR_COMBOS.map((c, i) => {
                const sel = c.cor.toLowerCase() === cor.toLowerCase() && c.cor2.toLowerCase() === cor2.toLowerCase();
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
                      sel ? "border-acento bg-superficie-alta" : "border-linha bg-superficie hover:border-acento-texto"
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
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="tipo-label text-ink-3">Criar minha combinação</span>
            <div className="flex gap-1 self-start rounded-pilula border border-linha bg-superficie p-0.5">
              {(["cor", "cor2"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={slot === s}
                  onClick={() => setSlot(s)}
                  className={`inline-flex min-h-9 items-center gap-1.5 rounded-pilula px-3 text-[0.8rem] transition-colors ${
                    slot === s ? "bg-superficie-alta text-ink shadow-suave" : "text-ink-3 hover:text-ink-2"
                  }`}
                >
                  <span
                    className="size-3.5 rounded-full border border-linha"
                    style={{ background: s === "cor" ? cor : cor2 }}
                  />
                  {s === "cor" ? "Cor 1" : "Cor 2"}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <label
                className="relative inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-linha"
                style={{ background: ativa }}
                title="Escolher cor"
              >
                <input
                  type="color"
                  value={ativa}
                  onChange={(e) => onColor(slot, e.target.value)}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label={`Cor ${slot === "cor" ? "1" : "2"} (seletor)`}
                />
              </label>
              {paleta.map((c) => {
                const sel = c.toLowerCase() === ativa.toLowerCase();
                const fromPhoto = photoColors.some((p) => p.toLowerCase() === c.toLowerCase());
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={sel}
                    aria-label={`${c}${fromPhoto ? " (da foto)" : ""}`}
                    title={fromPhoto ? "Da foto da capa" : c}
                    onClick={() => onColor(slot, c)}
                    className={`size-8 rounded-full transition-transform hover:scale-110 ${
                      sel ? "ring-2 ring-acento ring-offset-2 ring-offset-bg" : "border border-linha"
                    }`}
                    style={{ background: c }}
                  />
                );
              })}
            </div>
            {photoColors.length === 0 && hasCover && (
              <p className="tipo-label m-0 text-ink-3">Não deu pra ler cores dessa foto — use as sugestões.</p>
            )}

            <span
              className={`inline-flex w-fit items-center gap-1.5 rounded-pilula px-2.5 py-1 tipo-label ${
                aaOk ? "bg-superficie-alta text-ink-2" : "bg-critico/10 text-critico"
              }`}
              role="status"
            >
              <span aria-hidden className="size-1.5 rounded-full" style={{ background: aaOk ? "var(--acento)" : "var(--critico)" }} />
              {contraste === null
                ? "contraste: —"
                : `texto sobre a cor 1: ${contraste.toFixed(2)}:1 — ${aaOk ? "AA ✓" : "ajustado"}`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Vars de cor do evento a partir do par escolhido — para quem quiser aplicar `--ev` fora do
 *  resolvedor (ex.: um bloco isolado do preview). */
export function eventVarsFor(cor: string, cor2: string): CSSProperties {
  return eventColorVariables(cor, cor2) as CSSProperties;
}
