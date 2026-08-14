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
  eventoId: string;
  packId: string;
  expectedGuestsInicial: number;
  identityTokensInicial: Record<string, unknown>;
};

export function IdentityEditor({
  eventoId,
  packId,
  expectedGuestsInicial,
  identityTokensInicial,
}: Props) {
  const pack = PACKS[packId] as Pack | undefined;
  const presetInicial =
    typeof identityTokensInicial.presetId === "string"
      ? identityTokensInicial.presetId
      : IDENTITY_MODELS[0]!.id;

  const [presetId, setPresetId] = useState(presetInicial);
  const [expectedGuests, setExpectedGuests] = useState(String(expectedGuestsInicial));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const preset = IDENTITY_MODELS.find((m) => m.id === presetId) ?? IDENTITY_MODELS[0]!;

  const identityTokens = useMemo(() => {
    return {
      ...identityTokensInicial,
      presetId: preset.id,
      ...preset.camada,
    };
  }, [identityTokensInicial, preset]);

  const previewVars = useMemo(() => {
    if (!pack) return {};
    return resolveIdentityPreviewVars(pack, identityTokens);
  }, [pack, identityTokens]);

  const convidadosValidos = Number(expectedGuests) > 0 && Number.isFinite(Number(expectedGuests));

  const salvar = async () => {
    if (!convidadosValidos) return;
    setSalvando(true);
    setErro(false);
    setSalvo(false);
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/config`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedGuests: Number(expectedGuests),
          identityTokens,
        }),
      });
      if (!r.ok) throw new Error("falhou");
      setSalvo(true);
    } catch {
      setErro(true);
    } finally {
      setSalvando(false);
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
              setSalvo(false);
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
                  setSalvo(false);
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
            disabled={!convidadosValidos || salvando}
            onClick={() => void salvar()}
            className={`${adminClasses.primaryButton} ${
              !convidadosValidos || salvando ? "opacity-60" : ""
            }`}
          >
            {salvando ? "Salvando…" : "Salvar identidade"}
          </button>
          {salvo && <span className="text-sm text-ink-3">Salvo.</span>}
          {erro && <span className="text-sm text-critico">Não foi possível salvar.</span>}
        </div>
      </AdminSection>
    </div>
  );
}
