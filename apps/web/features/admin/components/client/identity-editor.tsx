"use client";

import {
  WALL_DISPLAY_MODELS,
  wallDisplayChoiceProblems,
  type WallDisplayModel,
} from "@albora/core";
import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { IDENTITY_MODELS } from "@albora/tokens";
import { useMemo, useState } from "react";
import {
  identityPreviewClassName,
  presetSwatchProps,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import { wallModelsFromTokens } from "@/features/admin/lib/wall-models";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";
import { TimezoneField } from "@/features/admin/components/client/timezone-field";

type Props = {
  eventId: string;
  packId: string;
  initialExpectedGuests: number;
  initialTimezone: string;
  initialIdentityTokens: Record<string, unknown>;
  initialTitle: string | null;
};

const FONT_OPTIONS = [
  { id: "serif", label: "Serifa clássica", value: "Fraunces, Georgia, serif" },
  {
    id: "sans",
    label: "Sem serifa",
    value: "\"Instrument Sans\", ui-sans-serif, system-ui, -apple-system, sans-serif",
  },
] as const;

type FontOptionId = (typeof FONT_OPTIONS)[number]["id"];

function toPartialCores(v: unknown): Record<string, string> {
  if (typeof v === "object" && v !== null) return v as Record<string, string>;
  return {};
}

function toPartialFontes(v: unknown): Record<string, string> {
  if (typeof v === "object" && v !== null) return v as Record<string, string>;
  return {};
}

function resolveCustomAccent(tokens: Record<string, unknown>, presetAccent: string | undefined): string | null {
  const saved = toPartialCores(tokens.cores).acento;
  if (!saved || saved === presetAccent) return null;
  return saved;
}

function resolveCustomFont(tokens: Record<string, unknown>, presetFont: string | undefined): FontOptionId | null {
  const saved = toPartialFontes(tokens.fontes).titulo;
  if (!saved || saved === presetFont) return null;
  const match = FONT_OPTIONS.find((f) => f.value === saved);
  return match ? match.id : null;
}

function resolveCustomBackground(tokens: Record<string, unknown>, presetBg: string | undefined): "dark" | "light" | null {
  const saved = tokens.background as string | undefined;
  if (!saved || saved === presetBg) return null;
  return saved === "light" ? "light" : saved === "dark" ? "dark" : null;
}

function modelLabel(id: string): string {
  return id
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-2.5 block text-[0.7rem] uppercase tracking-rotulo text-ink-3">
      {children}
    </span>
  );
}

export function IdentityEditor({
  eventId,
  packId,
  initialExpectedGuests,
  initialTimezone,
  initialIdentityTokens,
  initialTitle,
}: Props) {
  const pack = PACKS[packId] as Pack | undefined;

  const getInitialPreset = () => {
    const id = typeof initialIdentityTokens.presetId === "string"
      ? initialIdentityTokens.presetId
      : IDENTITY_MODELS[0]!.id;
    return IDENTITY_MODELS.find((m) => m.id === id) ?? IDENTITY_MODELS[0]!;
  };

  const [preset, setPreset] = useState(getInitialPreset);
  const [expectedGuests, setExpectedGuests] = useState(String(initialExpectedGuests));
  const [timezone, setTimezone] = useState(initialTimezone);
  const [wallModels, setWallModels] = useState<Set<WallDisplayModel>>(
    () => new Set(wallModelsFromTokens(initialIdentityTokens)),
  );

  const presetAccent = toPartialCores(preset.camada.cores).acento;
  const presetFont = toPartialFontes(preset.camada.fontes).titulo;
  const presetBackground = preset.camada.background as string | undefined;

  const [customAccent, setCustomAccent] = useState<string | null>(() =>
    resolveCustomAccent(initialIdentityTokens, presetAccent),
  );
  const [customFont, setCustomFont] = useState<FontOptionId | null>(() =>
    resolveCustomFont(initialIdentityTokens, presetFont),
  );
  const [customBackground, setCustomBackground] = useState<"dark" | "light" | null>(() =>
    resolveCustomBackground(initialIdentityTokens, presetBackground),
  );

  const [title, setTitle] = useState(initialTitle ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  const wallProblems = wallDisplayChoiceProblems([...wallModels]);

  const identityTokens = useMemo(() => {
    const presetCores = toPartialCores(preset.camada.cores);
    const presetFontes = toPartialFontes(preset.camada.fontes);

    const effectiveCores = customAccent
      ? { ...presetCores, acento: customAccent }
      : presetCores;

    const effectiveFontValue = customFont
      ? FONT_OPTIONS.find((f) => f.id === customFont)?.value
      : undefined;
    const effectiveFontes = effectiveFontValue
      ? { ...presetFontes, titulo: effectiveFontValue }
      : presetFontes;

    const effectiveBackground =
      customBackground ?? preset.camada.background;

    return {
      ...initialIdentityTokens,
      presetId: preset.id,
      ...preset.camada,
      ...(Object.keys(effectiveCores).length > 0 ? { cores: effectiveCores } : {}),
      ...(Object.keys(effectiveFontes).length > 0 ? { fontes: effectiveFontes } : {}),
      ...(effectiveBackground ? { background: effectiveBackground } : {}),
      telaoModelos: [...wallModels],
    };
  }, [initialIdentityTokens, preset, wallModels, customAccent, customFont, customBackground]);

  const previewVars = useMemo(() => {
    if (!pack) return {};
    return resolveIdentityPreviewVars(pack, identityTokens);
  }, [pack, identityTokens]);

  const guestsValid = Number(expectedGuests) > 0 && Number.isFinite(Number(expectedGuests));
  const canSave = guestsValid && wallProblems.length === 0;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(false);
    setSaved(false);
    try {
      const r = await fetch(`/api/admin/events/${eventId}/config`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedGuests: Number(expectedGuests),
          timezone,
          identityTokens,
          title: title.trim() || null,
        }),
      });
      if (!r.ok) throw new Error("falhou");
      setSaved(true);
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  };

  const changePreset = (m: (typeof IDENTITY_MODELS)[number]) => {
    setPreset(m);
    setCustomAccent(null);
    setCustomFont(null);
    setCustomBackground(null);
    setSaved(false);
  };

  if (!pack) {
    return (
      <AdminSection>
        <p className="m-0 text-critico">Pack do evento não encontrado.</p>
      </AdminSection>
    );
  }

  const effectiveBackground = customBackground ?? preset.camada.background ?? "dark";

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <h2 className="mb-1 mt-0 font-titulo text-lg">Configuração do evento</h2>
        <p className="mb-7 mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
          A identidade propaga para convidado, telão e peças impressas — um resolvedor, três superfícies.
        </p>

        <div className="mb-5">
          <FieldLabel>Nome do evento</FieldLabel>
          <input
            type="text"
            maxLength={120}
            placeholder="Ex.: João & Maria"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSaved(false);
            }}
            className="w-full max-w-sm rounded-token border border-linha bg-bg px-3.5 py-3 font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          />
          <p className="mb-0 mt-1.5 text-xs text-ink-3">
            Aparece como título na capa do app. Deixe em branco para usar o nome do pack.
          </p>
        </div>

        <div className="mb-5">
          <FieldLabel>Quantos convidados presentes?</FieldLabel>
          <input
            type="number"
            min={1}
            max={999}
            required
            value={expectedGuests}
            onChange={(e) => {
              setExpectedGuests(e.target.value);
              setSaved(false);
            }}
            className="w-full max-w-xs rounded-token border border-linha bg-bg px-3.5 py-3 font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          />
          <p className="mb-0 mt-1.5 text-xs text-ink-3">
            Estimativa de quem vai estar na festa. Usamos para medir a participação.
          </p>
          {!guestsValid && expectedGuests !== "" && (
            <p className="mb-0 mt-2 text-sm text-critico">
              Informe um número válido de convidados esperados.
            </p>
          )}
        </div>

        <div className="mb-7">
          <TimezoneField
            value={timezone}
            onChange={(fuso) => {
              setTimezone(fuso);
              setSaved(false);
            }}
          />
        </div>

        <div className="mb-7">
          <FieldLabel>Paleta base</FieldLabel>
          <div className="flex flex-col gap-2">
            {IDENTITY_MODELS.map((m) => {
              const selected = preset.id === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => changePreset(m)}
                  className={`flex cursor-pointer items-center gap-3 rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    selected
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg hover:border-acento-texto"
                  }`}
                >
                  <span {...presetSwatchProps(m.amostra)} />
                  <span className="flex-1 font-titulo text-[0.9rem] text-ink">{m.nome}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                      selected ? "border-acento bg-acento" : "border-linha bg-bg"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-sobre-acento" />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`mt-3 ${identityPreviewClassName}`} style={previewVars}>
            <p className="m-0 font-titulo text-xl text-acento-texto">
              {resolvePackText(pack, "landing.exemplo.nome")}
            </p>
            <p className="mb-0 mt-2 text-sm text-ink-2">Preview ao vivo</p>
          </div>
        </div>

        <div className="mb-7">
          <FieldLabel>Cor de destaque</FieldLabel>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2.5 rounded-token border border-linha bg-bg px-3.5 py-2.5 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto">
              <span
                className="h-5 w-5 shrink-0 rounded-full border border-linha"
                style={{ background: customAccent ?? presetAccent ?? "transparent" }}
              />
              <span className="font-titulo text-sm text-ink">
                {customAccent ? "Personalizada" : "Da paleta"}
              </span>
              <input
                type="color"
                className="sr-only"
                value={customAccent ?? presetAccent ?? IDENTITY_MODELS[0]!.amostra}
                onChange={(e) => {
                  setCustomAccent(e.target.value);
                  setSaved(false);
                }}
              />
            </label>
            {customAccent && (
              <button
                type="button"
                onClick={() => {
                  setCustomAccent(null);
                  setSaved(false);
                }}
                className="rounded-token border border-linha bg-bg px-3.5 py-2.5 font-titulo text-sm text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
              >
                Usar cor da paleta
              </button>
            )}
          </div>
        </div>

        <div className="mb-7">
          <FieldLabel>Estilo de fonte</FieldLabel>
          <div className="flex gap-2">
            {FONT_OPTIONS.map((opt) => {
              const isActive = customFont
                ? customFont === opt.id
                : !presetFont || presetFont === opt.value || (opt.id === "serif" && !presetFont);
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const presetFontValue = toPartialFontes(preset.camada.fontes).titulo;
                    setCustomFont(presetFontValue === opt.value ? null : opt.id);
                    setSaved(false);
                  }}
                  className={`flex-1 cursor-pointer rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    isActive
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg hover:border-acento-texto"
                  }`}
                >
                  <span
                    className="block text-lg text-ink"
                    style={{ fontFamily: opt.value }}
                  >
                    Aa
                  </span>
                  <span className="mt-1 block font-corpo text-xs text-ink-2">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-7">
          <FieldLabel>Fundo padrão</FieldLabel>
          <div className="flex gap-2">
            {(["dark", "light"] as const).map((mode) => {
              const active = effectiveBackground === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    const presetBg = preset.camada.background ?? "dark";
                    setCustomBackground(presetBg === mode ? null : mode);
                    setSaved(false);
                  }}
                  className={`flex flex-1 cursor-pointer items-center gap-2.5 rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    active
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg hover:border-acento-texto"
                  }`}
                >
                  {mode === "dark" ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-ink-2">
                      <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" fill="currentColor" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0 text-ink-2">
                      <circle cx="8" cy="8" r="2.75" fill="currentColor" />
                      <path d="M8 1.5V3M8 13v1.5M1.5 8H3M13 8h1.5M3.6 3.6l1 1M11.4 11.4l1 1M11.4 3.6l1-1M3.6 11.4l1-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                  <div>
                    <span className="block font-titulo text-sm text-ink">
                      {mode === "dark" ? "Escuro" : "Claro"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="mb-1 mt-0 font-titulo text-lg">Modelos do telão</h2>
          <p className="mb-4 mt-1.5 text-[0.875rem] leading-relaxed text-ink-2">
            Escolha os modelos que entram no rodízio da parede. A mudança vale para a próxima foto que subir.
          </p>
          {wallProblems.length > 0 && (
            <div className="mb-4 rounded-token border border-critico bg-superficie px-4 py-3">
              <p className="m-0 text-sm text-critico">{wallProblems.join(" ")}</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            {WALL_DISPLAY_MODELS.map((model) => {
              const selected = wallModels.has(model);
              return (
                <button
                  key={model}
                  type="button"
                  onClick={() => {
                    setWallModels((prev) => {
                      const next = new Set(prev);
                      if (next.has(model)) next.delete(model);
                      else next.add(model);
                      return next;
                    });
                    setSaved(false);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    selected
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg hover:border-acento-texto"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                      selected ? "border-acento bg-acento" : "border-linha bg-bg"
                    }`}
                  >
                    {selected && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className="text-sobre-acento">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <span className="font-titulo text-[0.9rem] text-ink">{modelLabel(model)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => void save()}
            className={`${adminClasses.primaryButton} ${
              !canSave || saving ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {saving ? "Salvando…" : "Salvar identidade"}
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-pilula border border-acento-texto px-3 py-1.5 font-titulo text-[0.8125rem] text-acento-texto">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Salvo
            </span>
          )}
          {error && (
            <span className="text-sm text-critico">
              Não foi possível salvar agora. Tente de novo.
            </span>
          )}
        </div>
      </AdminSection>
    </div>
  );
}
