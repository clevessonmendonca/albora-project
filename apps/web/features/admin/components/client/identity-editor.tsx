"use client";

import {
  WALL_DISPLAY_MODELS,
  wallDisplayChoiceProblems,
  type WallDisplayModel,
} from "@albora/core";
import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { IDENTITY_MODELS } from "@albora/tokens";
import { Button, PhoneFrame, TextField } from "@albora/ui-web";
import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  identityPreviewClassName,
  presetSwatchProps,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import { wallModelsFromTokens } from "@/features/admin/lib/wall-models";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
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

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="tipo-label mb-2.5 block uppercase text-ink-3">{children}</span>
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
  const previewTitle = title.trim() || resolvePackText(pack, "landing.exemplo.nome");
  const missionLabel = pack.missoes[0]
    ? resolvePackText(pack, pack.missoes[0].chaveTitulo)
    : "Foto do dia";

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <div className="mb-7">
          <h2 className="tipo-subtitle m-0">Configuração do evento</h2>
          <p className="tipo-caption m-0 mt-1.5 max-w-[38rem] text-ink-2">
            A identidade propaga para convidado, telão e peças impressas — um resolvedor, três
            superfícies.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start">
          <div className="flex flex-col gap-7">
            <TextField
              label="Nome do evento"
              maxLength={120}
              placeholder="Ex.: João & Maria"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              hint="Aparece como título na capa do app. Deixe em branco para usar o nome do pack."
              inputClassName="max-w-sm"
            />

            <TextField
              label="Quantos convidados presentes?"
              type="number"
              min={1}
              max={999}
              required
              value={expectedGuests}
              onChange={(e) => {
                setExpectedGuests(e.target.value);
                setSaved(false);
              }}
              hint="Estimativa de quem vai estar na festa. Usamos para medir a participação."
              {...(!guestsValid && expectedGuests !== ""
                ? { error: "Informe um número válido de convidados esperados." }
                : {})}
              inputClassName="max-w-xs"
            />

            <TimezoneField
              value={timezone}
              onChange={(fuso) => {
                setTimezone(fuso);
                setSaved(false);
              }}
            />

            <div className="h-px bg-linha" />

            <div>
              <FieldLabel>Paleta base</FieldLabel>
              <div className="flex flex-col gap-2">
                {IDENTITY_MODELS.map((m) => {
                  const selected = preset.id === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => changePreset(m)}
                      className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
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
            </div>

            <CorField
              label="Cor de destaque"
              hint="Botões, marcações e links"
              value={customAccent ?? presetAccent ?? IDENTITY_MODELS[0]!.amostra}
              custom={customAccent !== null}
              onChange={(cor) => {
                setCustomAccent(cor);
                setSaved(false);
              }}
              onReset={() => {
                setCustomAccent(null);
                setSaved(false);
              }}
            />

            <div>
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
                      role="radio"
                      aria-checked={isActive}
                      onClick={() => {
                        const presetFontValue = toPartialFontes(preset.camada.fontes).titulo;
                        setCustomFont(presetFontValue === opt.value ? null : opt.id);
                        setSaved(false);
                      }}
                      className={`min-h-[3.25rem] flex-1 cursor-pointer rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                        isActive
                          ? "border-2 border-acento bg-superficie-alta"
                          : "border border-linha bg-bg hover:border-acento-texto"
                      }`}
                    >
                      <span className="block text-lg text-ink" style={{ fontFamily: opt.value }}>
                        Aa
                      </span>
                      <span className="mt-1 block font-corpo text-xs text-ink-2">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <FieldLabel>Fundo padrão</FieldLabel>
              <div className="flex gap-2">
                {(["dark", "light"] as const).map((mode) => {
                  const active = effectiveBackground === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        const presetBg = preset.camada.background ?? "dark";
                        setCustomBackground(presetBg === mode ? null : mode);
                        setSaved(false);
                      }}
                      className={`flex min-h-[3.25rem] flex-1 cursor-pointer items-center gap-2.5 rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
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
                      <span className="block font-titulo text-sm text-ink">
                        {mode === "dark" ? "Escuro" : "Claro"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-6">
            <PhoneFrame
              title="Preview ao vivo"
              note="Como o convidado vê a marca de vocês assim que abre o app — atualiza a cada mudança."
            >
              <PreviewScreen previewVars={previewVars} title={previewTitle} missionLabel={missionLabel} />
            </PhoneFrame>
            <div className={`mt-4 ${identityPreviewClassName}`} style={previewVars}>
              <p className="m-0 font-titulo text-lg text-acento-texto">{previewTitle}</p>
              <p className="mb-0 mt-2 text-sm text-ink-2">Prévia da capa impressa e do telão</p>
            </div>
          </aside>
        </div>

        <div className="my-8 h-px bg-linha" />

        <div>
          <h2 className="tipo-subtitle m-0">Modelos do telão</h2>
          <p className="tipo-caption m-0 mt-1.5 text-ink-2">
            Escolha os modelos que entram no rodízio da parede. A mudança vale para a próxima foto
            que subir.
          </p>
          {wallProblems.length > 0 && (
            <div className="mt-4 rounded-token border border-critico bg-superficie px-4 py-3">
              <p className="m-0 text-sm text-critico">{wallProblems.join(" ")}</p>
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2">
            {WALL_DISPLAY_MODELS.map((model) => {
              const selected = wallModels.has(model);
              return (
                <button
                  key={model}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => {
                    setWallModels((prev) => {
                      const next = new Set(prev);
                      if (next.has(model)) next.delete(model);
                      else next.add(model);
                      return next;
                    });
                    setSaved(false);
                  }}
                  className={`flex min-h-[3.25rem] cursor-pointer items-center gap-3 rounded-token p-3.5 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
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
          <Button
            variant="primary"
            size="lg"
            disabled={!canSave || saving}
            onClick={() => void save()}
          >
            {saving ? "Salvando…" : "Salvar identidade"}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 rounded-pilula border border-acento-texto px-3 py-1.5 font-titulo text-[0.8125rem] text-acento-texto">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path d="M2 6l2.5 2.5L10 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Salvo
            </span>
          )}
          {error && (
            <span role="alert" className="text-sm text-critico">
              Não foi possível salvar agora. Tente de novo.
            </span>
          )}
        </div>
      </AdminSection>
    </div>
  );
}

function CorField({
  label,
  hint,
  value,
  custom,
  onChange,
  onReset,
}: {
  label: string;
  hint: string;
  value: string;
  custom: boolean;
  onChange: (cor: string) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap items-center gap-2.5">
        <label className="relative flex min-h-[3.25rem] flex-1 cursor-pointer items-center justify-between gap-4 rounded-token border border-linha bg-bg px-4 py-2.5 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto">
          <div className="flex flex-col gap-0.5">
            <span className="font-titulo text-sm text-ink">{custom ? "Personalizada" : "Da paleta"}</span>
            <span className="text-xs text-ink-3">{hint}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2.5">
            <span
              className="size-7 shrink-0 rounded-full border border-linha"
              style={{ backgroundColor: value }}
            />
            <span className="w-[4.5rem] text-right font-mono text-[0.75rem] uppercase tracking-wider text-ink-2">
              {value}
            </span>
          </div>
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        {custom && (
          <button
            type="button"
            onClick={onReset}
            className="min-h-[3.25rem] shrink-0 cursor-pointer rounded-token border border-linha bg-bg px-3.5 font-titulo text-sm text-ink transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
          >
            Usar cor da paleta
          </button>
        )}
      </div>
    </div>
  );
}

function PreviewScreen({
  previewVars,
  title,
  missionLabel,
}: {
  previewVars: CSSProperties;
  title: string;
  missionLabel: string;
}) {
  return (
    <div className="flex h-full flex-col bg-bg font-corpo text-ink" style={previewVars}>
      <div className="flex items-center justify-between px-5 pb-1 pt-3 text-[0.65rem] tabular-nums text-ink-3">
        <span>9:41</span>
        <div className="flex items-center gap-1" aria-hidden>
          <span className="h-1 w-3 rounded-full bg-ink-3" />
          <span className="h-1.5 w-4 rounded-sm bg-ink-3" />
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-5 pb-4 pt-2">
        <div className="mb-4 h-24 w-full shrink-0 rounded-token border border-linha bg-acento-superficie" />
        <p className="m-0 font-titulo text-[1.375rem] leading-tight text-acento-texto">{title}</p>
        <p className="mb-5 mt-2 text-[0.8125rem] text-ink-2">Missão · {missionLabel}</p>

        <div className="mt-auto flex flex-col gap-2.5">
          <span className="flex h-12 items-center justify-center rounded-pilula bg-acento font-titulo text-[0.875rem] text-sobre-acento">
            Tirar foto
          </span>
          <span className="flex h-11 items-center justify-center rounded-pilula border border-linha text-[0.8125rem] text-ink-2">
            Ver álbum
          </span>
        </div>
      </div>

      <div className="flex items-center justify-around border-t border-linha py-3" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span key={i} className={`size-2 rounded-full ${i === 1 ? "bg-acento" : "bg-linha"}`} />
        ))}
      </div>
    </div>
  );
}
