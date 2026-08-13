"use client";

import { PACKS, texto, type Pack } from "@albora/packs";
import { MARCA_ALBORA, MODELOS_DE_IDENTIDADE, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CamadaTokens } from "@albora/tokens";
import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { raio } from "../../../../landing/pecas";
import { AdminSection, adminStyles } from "../../../casca";

type Props = {
  eventoId: string;
  packId: string;
  expectedGuestsInicial: number;
  identityTokensInicial: Record<string, unknown>;
};

export function IdentidadeDoEvento({
  eventoId,
  packId,
  expectedGuestsInicial,
  identityTokensInicial,
}: Props) {
  const pack = PACKS[packId] as Pack | undefined;
  const presetInicial =
    typeof identityTokensInicial.presetId === "string"
      ? identityTokensInicial.presetId
      : MODELOS_DE_IDENTIDADE[0]!.id;

  const [presetId, setPresetId] = useState(presetInicial);
  const [expectedGuests, setExpectedGuests] = useState(String(expectedGuestsInicial));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(false);
  const [salvo, setSalvo] = useState(false);

  const preset = MODELOS_DE_IDENTIDADE.find((m) => m.id === presetId) ?? MODELOS_DE_IDENTIDADE[0]!;

  const identityTokens = useMemo(() => {
    return {
      ...identityTokensInicial,
      presetId: preset.id,
      ...preset.camada,
    };
  }, [identityTokensInicial, preset]);

  const previewVars = useMemo(() => {
    if (!pack) return {} as CSSProperties;
    return paraVariaveis(
      resolverTokens({
        marca: MARCA_ALBORA,
        ...(pack.tokens ? { pack: pack.tokens } : {}),
        evento: identityTokens as CamadaTokens,
      }),
    ) as CSSProperties;
  }, [pack, identityTokens]);

  const convidadosValidos = Number(expectedGuests) > 0 && Number.isFinite(Number(expectedGuests));

  const salvar = async () => {
    if (!convidadosValidos) return;
    setSalvando(true);
    setErro(false);
    setSalvo(false);
    try {
      const r = await fetch(`/api/admin/eventos/${eventoId}/config`, {
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
        <p style={{ margin: 0, color: "var(--critico)" }}>Pack do evento não encontrado.</p>
      </AdminSection>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <AdminSection>
        <p style={{ margin: "0 0 1.25rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          A identidade visual propaga para convidado, telão e peças impressas — um resolvedor,
          três superfícies.
        </p>

        <label style={rotulo}>
          Convidados esperados
          <input
            type="number"
            min={1}
            value={expectedGuests}
            onChange={(e) => {
              setExpectedGuests(e.target.value);
              setSalvo(false);
            }}
            style={campo}
          />
        </label>

        <div
          style={{
            display: "grid",
            gap: "1.25rem",
            gridTemplateColumns: "minmax(12rem, 1fr) minmax(14rem, 1fr)",
            marginTop: "1.25rem",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {MODELOS_DE_IDENTIDADE.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPresetId(m.id);
                  setSalvo(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  textAlign: "left",
                  border:
                    presetId === m.id ? "2px solid var(--acento)" : "1px solid var(--linha)",
                  backgroundColor: presetId === m.id ? "var(--superficie-alta)" : "var(--bg)",
                  cursor: "pointer",
                  ...raio("var(--raio)"),
                }}
              >
                <span
                  style={{
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "50%",
                    backgroundColor: m.amostra,
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: "var(--fonte-titulo)" }}>{m.nome}</span>
              </button>
            ))}
          </div>

          <div
            style={{
              ...previewVars,
              padding: "1.25rem",
              ...raio("var(--raio)"),
              backgroundColor: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--fonte-corpo)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.25rem",
                color: "var(--acento-texto)",
              }}
            >
              {texto(pack, "landing.exemplo.nome")}
            </p>
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", color: "var(--ink-2)" }}>
              Preview ao vivo com resolverTokens.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <button
            type="button"
            disabled={!convidadosValidos || salvando}
            onClick={() => void salvar()}
            style={{
              ...adminStyles.primaryButton,
              opacity: !convidadosValidos || salvando ? 0.6 : 1,
            }}
          >
            {salvando ? "Salvando…" : "Salvar identidade"}
          </button>
          {salvo && (
            <span style={{ color: "var(--ink-3)", fontSize: "0.875rem" }}>Salvo.</span>
          )}
          {erro && (
            <span style={{ color: "var(--critico)", fontSize: "0.875rem" }}>
              Não foi possível salvar.
            </span>
          )}
        </div>
      </AdminSection>
    </div>
  );
}

const rotulo: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  fontFamily: "var(--fonte-titulo)",
  fontSize: "0.875rem",
};

const campo: CSSProperties = {
  padding: "0.65rem 0.75rem",
  border: "1px solid var(--linha)",
  backgroundColor: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--fonte-corpo)",
  fontSize: "1rem",
  ...raio("var(--raio)"),
};
