"use client";

import { PACKS, resolvePackText, type Pack } from "@albora/packs";
import { IDENTITY_MODELS } from "@albora/tokens";
import { useMemo, useState } from "react";
import {
  identityPreviewClassName,
  presetSwatchProps,
  resolveIdentityPreviewVars,
} from "@/features/admin/lib/identity-preview";
import { AdminSection, adminClasses } from "@/features/admin/components/server/admin-shell";

type Props = {
  eventId: string;
  packId: string;
  initialExpectedGuests: number;
  initialIdentityTokens: Record<string, unknown>;
};

export function IdentityEditor({
  eventId,
  packId,
  initialExpectedGuests,
  initialIdentityTokens,
}: Props) {
  const pack = PACKS[packId] as Pack | undefined;
  const initialPreset =
    typeof initialIdentityTokens.presetId === "string"
      ? initialIdentityTokens.presetId
      : IDENTITY_MODELS[0]!.id;

  const [presetId, setPresetId] = useState(initialPreset);
  const [expectedGuests, setExpectedGuests] = useState(String(initialExpectedGuests));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  const preset = IDENTITY_MODELS.find((m) => m.id === presetId) ?? IDENTITY_MODELS[0]!;

  const identityTokens = useMemo(() => {
    return {
      ...initialIdentityTokens,
      presetId: preset.id,
      ...preset.camada,
    };
  }, [initialIdentityTokens, preset]);

  const previewVars = useMemo(() => {
    if (!pack) return {};
    return resolveIdentityPreviewVars(pack, identityTokens);
  }, [pack, identityTokens]);

  const guestsValid = Number(expectedGuests) > 0 && Number.isFinite(Number(expectedGuests));

  const save = async () => {
    if (!guestsValid) return;
    setSaving(true);
    setError(false);
    setSaved(false);
    try {
      const r = await fetch(`/api/admin/events/${eventId}/config`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedGuests: Number(expectedGuests),
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
        <p className="mb-5 mt-0 leading-relaxed text-ink-2">
          A identidade visual propaga para convidado, telão e peças impressas — um resolvedor,
          três superfícies.
        </p>

        <label className="flex flex-col gap-1.5 font-titulo text-sm">
          Convidados esperados
          <input
            type="number"
            min={1}
            value={expectedGuests}
            onChange={(e) => {
              setExpectedGuests(e.target.value);
              setSaved(false);
            }}
            className="rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-base text-ink"
          />
        </label>

        <div className="mt-5 grid grid-cols-[minmax(12rem,1fr)_minmax(14rem,1fr)] gap-5">
          <div className="flex flex-col gap-3">
            {IDENTITY_MODELS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPresetId(m.id);
                  setSaved(false);
                }}
                className={`flex cursor-pointer items-center gap-3 rounded-token p-3 text-left ${
                  presetId === m.id
                    ? "border-2 border-acento bg-superficie-alta"
                    : "border border-linha bg-bg"
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
            <p className="mb-0 mt-3 text-sm text-ink-2">Preview ao vivo com resolveTokens.</p>
          </div>
        </div>

        <div className="mt-6 flex items-center gap-4">
          <button
            type="button"
            disabled={!guestsValid || saving}
            onClick={() => void save()}
            className={`${adminClasses.primaryButton} ${
              !guestsValid || saving ? "opacity-60" : ""
            }`}
          >
            {saving ? "Salvando…" : "Salvar identidade"}
          </button>
          {saved && <span className="text-sm text-ink-3">Salvo.</span>}
          {error && <span className="text-sm text-critico">Não foi possível salvar.</span>}
        </div>
      </AdminSection>
    </div>
  );
}
