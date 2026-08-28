"use client";

import React, { useMemo, useState } from "react";
import { ALBORA_BRAND, MODELOS_DE_IDENTIDADE, resolveTokens, toVariables } from "@albora/tokens";
import type { TokenLayer } from "@albora/tokens";
import type { CSSProperties } from "react";

type Props = {
  vendorId: string;
  initialBrandTokens: Record<string, unknown>;
};

type Background = "light" | "dark";

const BACKGROUND_OPCOES: { valor: Background; label: string }[] = [
  { valor: "light", label: "Claro" },
  { valor: "dark", label: "Escuro" },
];

function resolverBrandPreviewVars(brandTokens: Record<string, unknown>): CSSProperties {
  return toVariables(
    resolveTokens({
      marca: ALBORA_BRAND,
      vendor: brandTokens as TokenLayer,
      pack: { background: brandTokens.background as Background | undefined ?? "light" },
    }),
  ) as CSSProperties;
}

function extrairAcento(tokens: Record<string, unknown>): string {
  const cores = tokens.cores;
  if (cores && typeof cores === "object" && !Array.isArray(cores)) {
    const acento = (cores as Record<string, unknown>).acento;
    if (typeof acento === "string" && /^#[0-9a-fA-F]{6}$/.test(acento)) return acento;
  }
  return ALBORA_BRAND.cores.acento;
}

function extrairBackground(tokens: Record<string, unknown>): Background {
  const bg = tokens.background;
  return bg === "light" || bg === "dark" ? bg : "dark";
}

function extrairCorOpcional(tokens: Record<string, unknown>, chave: string): string {
  const cores = tokens.cores;
  if (cores && typeof cores === "object" && !Array.isArray(cores)) {
    const v = (cores as Record<string, unknown>)[chave];
    if (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v)) return v;
  }
  return "";
}

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Hex nunca vem de código — só de input do usuário após `HEX.test()`. Preview usa o mesmo resolvedor do convidado e do telão. */
export function VendorBrandTokensEditor({ vendorId, initialBrandTokens }: Props) {
  const [acento, setAcento] = useState(extrairAcento(initialBrandTokens));
  const [background, setBackground] = useState<Background>(extrairBackground(initialBrandTokens));
  const [papel, setPapel] = useState(extrairCorOpcional(initialBrandTokens, "papel"));
  const [noite, setNoite] = useState(extrairCorOpcional(initialBrandTokens, "noite"));
  const [tinta, setTinta] = useState(extrairCorOpcional(initialBrandTokens, "tinta"));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const previewTokens = useMemo<Record<string, unknown>>(() => {
    const cores: Record<string, string> = {};
    if (HEX.test(acento)) cores.acento = acento;
    if (HEX.test(papel)) cores.papel = papel;
    if (HEX.test(noite)) cores.noite = noite;
    if (HEX.test(tinta)) cores.tinta = tinta;
    return { cores, background };
  }, [acento, background, papel, noite, tinta]);

  const previewVars = useMemo(() => resolverBrandPreviewVars(previewTokens), [previewTokens]);

  const acentoInvalido = acento !== "" && !HEX.test(acento);
  const papelInvalido = papel !== "" && !HEX.test(papel);
  const noiteInvalido = noite !== "" && !HEX.test(noite);
  const tintaInvalido = tinta !== "" && !HEX.test(tinta);
  const podeAlternar = !acentoInvalido && !papelInvalido && !noiteInvalido && !tintaInvalido;

  const salvar = async () => {
    if (!podeAlternar) return;
    setSalvando(true);
    setErro(null);
    setSalvo(false);
    try {
      const cores: Record<string, string> = {};
      if (HEX.test(acento)) cores.acento = acento;
      if (HEX.test(papel)) cores.papel = papel;
      if (HEX.test(noite)) cores.noite = noite;
      if (HEX.test(tinta)) cores.tinta = tinta;

      const body: Record<string, unknown> = { background };
      if (Object.keys(cores).length > 0) body.cores = cores;

      const r = await fetch(`/api/vendors/${vendorId}/brand-tokens`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = (await r.json()) as { message?: string };
        throw new Error(e.message ?? "Erro ao salvar");
      }
      setSalvo(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar agora");
    } finally {
      setSalvando(false);
    }
  };

  const campoClasse =
    "w-full max-w-xs rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento";
  const erroClasse = "mb-0 mt-1 text-xs text-critico";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="mb-1 mt-0 font-titulo text-lg font-light tracking-titulo">
          Identidade da marca
        </h2>
        <p className="mb-0 mt-0 text-sm text-ink-2">
          As cores e o tema definidos aqui propagam para todas as festas gerenciadas por este
          portal.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <div>
            <label className="mb-2 block font-titulo text-sm text-ink">Cor de destaque</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={HEX.test(acento) ? acento : ALBORA_BRAND.cores.acento}
                onChange={(e) => {
                  setAcento(e.target.value);
                  setSalvo(false);
                }}
                className="h-10 w-10 cursor-pointer rounded-token border border-linha bg-bg p-0.5"
                aria-label="Escolher cor de destaque"
              />
              <input
                type="text"
                value={acento}
                onChange={(e) => {
                  setAcento(e.target.value);
                  setSalvo(false);
                }}
                placeholder="ex: acento em hex"
                className={campoClasse}
                aria-label="Hex da cor de destaque"
              />
            </div>
            {acentoInvalido && (
              <p className={erroClasse}>Use o formato hexadecimal — 6 dígitos após o #</p>
            )}
          </div>

          <div>
            <label className="mb-2 block font-titulo text-sm text-ink">Tema de fundo</label>
            <div className="flex gap-3">
              {BACKGROUND_OPCOES.map(({ valor, label }) => (
                <button
                  key={valor}
                  type="button"
                  onClick={() => {
                    setBackground(valor);
                    setSalvo(false);
                  }}
                  className={`cursor-pointer rounded-token px-4 py-2 font-titulo text-sm transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] ${
                    background === valor
                      ? "border-2 border-acento bg-superficie-alta text-ink"
                      : "border border-linha bg-bg text-ink-2 hover:border-acento-texto"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <details className="rounded-token border border-linha bg-superficie px-4 py-3">
            <summary className="cursor-pointer font-titulo text-sm text-ink-2">
              Neutros opcionais
            </summary>
            <div className="mt-4 flex flex-col gap-4">
              {(
                [
                  { chave: "papel", label: "Papel (fundo claro)", valor: papel, set: setPapel },
                  { chave: "noite", label: "Noite (fundo escuro)", valor: noite, set: setNoite },
                  { chave: "tinta", label: "Tinta (texto sobre claro)", valor: tinta, set: setTinta },
                ] as const
              ).map(({ chave, label, valor, set }) => (
                <div key={chave}>
                  <label className="mb-2 block text-xs text-ink-2">{label}</label>
                  <div className="flex items-center gap-3">
                    {HEX.test(valor) && (
                      <span
                        className="inline-block size-7 shrink-0 rounded-full border border-linha"
                        style={{ background: valor }}
                        aria-hidden
                      />
                    )}
                    <input
                      type="text"
                      value={valor}
                      onChange={(e) => {
                        set(e.target.value);
                        setSalvo(false);
                      }}
                      placeholder="ex: neutro em hex"
                      className={campoClasse}
                    />
                  </div>
                  {valor !== "" && !HEX.test(valor) && (
                    <p className={erroClasse}>Formato inválido — 6 dígitos após o #</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        </div>

        <div
          className="w-56 shrink-0 self-start rounded-token p-5 font-corpo text-ink"
          style={previewVars}
          aria-label="Preview da marca"
          data-testid="brand-preview"
        >
          <p className="m-0 font-titulo text-xl text-acento-texto">Pré-visualização</p>
          <p className="mb-0 mt-3 text-sm text-ink-2">
            A identidade ao vivo — mesma cadeia do convidado.
          </p>
          <div className="mt-4 flex gap-2">
            <span className="rounded-pilula bg-acento px-3 py-1 text-xs text-sobre-acento">
              Acento
            </span>
            <span className="rounded-pilula bg-superficie px-3 py-1 text-xs text-ink">
              Superficie
            </span>
          </div>
        </div>
      </div>

      <div>
        <p className="mb-3 mt-0 text-xs text-ink-3">
          Presets de paleta do modelo de identidade ({MODELOS_DE_IDENTIDADE.length} disponíveis):
        </p>
        <div className="flex flex-wrap gap-2">
          {MODELOS_DE_IDENTIDADE.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                const camada = m.camada;
                if (camada.cores?.acento) setAcento(camada.cores.acento);
                if (camada.cores?.papel) setPapel(camada.cores.papel);
                if (camada.cores?.noite) setNoite(camada.cores.noite);
                if (camada.cores?.tinta) setTinta(camada.cores.tinta);
                const bg = camada.background;
                if (bg === "light" || bg === "dark") setBackground(bg);
                setSalvo(false);
              }}
              className="flex cursor-pointer items-center gap-2 rounded-token border border-linha bg-bg px-3 py-2 text-sm transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
            >
              <span
                className="inline-block size-4 shrink-0 rounded-full"
                style={{ background: m.amostra }}
                aria-hidden
              />
              {m.nome}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={!podeAlternar || salvando}
          onClick={() => void salvar()}
          className={`rounded-token bg-acento px-5 py-[0.65rem] font-titulo text-sm text-sobre-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-acento ${
            !podeAlternar || salvando ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          {salvando ? "Salvando…" : "Salvar identidade"}
        </button>
        {salvo && (
          <span className="text-sm text-acento-texto">✓ Identidade salva com sucesso</span>
        )}
        {erro && <span className="text-sm text-critico">{erro}</span>}
      </div>
    </div>
  );
}
