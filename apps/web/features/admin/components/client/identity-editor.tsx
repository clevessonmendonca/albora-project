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
};

export function IdentityEditor({
  eventId,
  packId,
  initialExpectedGuests,
  initialTimezone,
  initialIdentityTokens,
}: Props) {
  const pack = PACKS[packId] as Pack | undefined;
  const initialPreset =
    typeof initialIdentityTokens.presetId === "string"
      ? initialIdentityTokens.presetId
      : IDENTITY_MODELS[0]!.id;

  const [presetId, setPresetId] = useState(initialPreset);
  const [expectedGuests, setExpectedGuests] = useState(String(initialExpectedGuests));
  const [timezone, setTimezone] = useState(initialTimezone);
  const [wallModels, setWallModels] = useState<Set<WallDisplayModel>>(
    () => new Set(wallModelsFromTokens(initialIdentityTokens)),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  const preset = IDENTITY_MODELS.find((m) => m.id === presetId) ?? IDENTITY_MODELS[0]!;
  const wallProblems = wallDisplayChoiceProblems([...wallModels]);

  const identityTokens = useMemo(() => {
    return {
      ...initialIdentityTokens,
      presetId: preset.id,
      ...preset.camada,
      telaoModelos: [...wallModels],
    };
  }, [initialIdentityTokens, preset, wallModels]);

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

  if (!pack) {
    return (
      <AdminSection>
        <p className="m-0 text-critico">Pack do evento não encontrado.</p>
      </AdminSection>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Configuração do evento</h2>
        <p className="mb-6 mt-0 leading-relaxed text-ink-2">
          A identidade visual propaga para convidado, telão e peças impressas — um resolvedor,
          três superfícies. Tudo que você define aqui reflete instantaneamente nos três canais.
        </p>

        <div className="mb-5">
          <label className="mb-2 block font-titulo text-sm text-ink">
            Convidados esperados
          </label>
          <input
            type="number"
            min={1}
            value={expectedGuests}
            onChange={(e) => {
              setExpectedGuests(e.target.value);
              setSaved(false);
            }}
            className="w-full max-w-xs rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          />
          {!guestsValid && expectedGuests !== "" && (
            <p className="mb-0 mt-2 text-sm text-critico">
              Informe um número válido de convidados esperados.
            </p>
          )}
        </div>

        <div className="mb-6">
          <TimezoneField
            value={timezone}
            onChange={(fuso) => {
              setTimezone(fuso);
              setSaved(false);
            }}
          />
        </div>

        <div className="mb-6">
          <label className="mb-3 block font-titulo text-sm text-ink">
            Paleta de cores
          </label>
          <div className="grid grid-cols-[minmax(12rem,1fr)_minmax(14rem,1fr)] gap-5">
            <div className="flex flex-col gap-3">
              {IDENTITY_MODELS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPresetId(m.id);
                    setSaved(false);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-token p-3 text-left transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    presetId === m.id
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg hover:border-acento-texto"
                  }`}
                >
                  <span {...presetSwatchProps(m.amostra)} />
                  <span className="font-titulo">{m.nome}</span>
                </button>
              ))}
            </div>

            <div className={identityPreviewClassName} style={previewVars}>
              <p className="m-0 font-titulo text-xl text-acento-texto">
                {resolvePackText(pack, "landing.exemplo.nome")}
              </p>
              <p className="mb-0 mt-3 text-sm text-ink-2">
                Preview ao vivo da paleta selecionada.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-3 mt-0 font-titulo text-lg">Modelos do telão</h2>
          <p className="mb-4 mt-0 text-[0.9375rem] leading-relaxed text-ink-2">
            Escolha os modelos que entram no rodízio da parede. A mudança vale para a próxima
            foto que subir.
          </p>
          {wallProblems.length > 0 && (
            <div className="mb-4 rounded-token border border-critico bg-superficie px-4 py-3">
              <p className="m-0 text-sm text-critico">{wallProblems.join(" ")}</p>
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(8rem,1fr))] gap-2">
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
                  className={`cursor-pointer rounded-token p-3 font-titulo text-sm transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    selected
                      ? "border-2 border-acento bg-superficie-alta"
                      : "border border-linha bg-bg hover:border-acento-texto"
                  }`}
                >
                  {model}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            disabled={!canSave || saving}
            onClick={() => void save()}
            className={`${adminClasses.primaryButton} ${
              !canSave || saving ? "cursor-not-allowed opacity-50" : ""
            }`}
          >
            {saving ? "Salvando alterações…" : "Salvar identidade"}
          </button>
          {saved && (
            <span className="text-sm text-acento-texto">
              ✓ Alterações salvas com sucesso
            </span>
          )}
          {error && (
            <span className="text-sm text-critico">
              Não foi possível salvar agora. Tente novamente em instantes.
            </span>
          )}
        </div>
      </AdminSection>
    </div>
  );
}
