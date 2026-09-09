"use client";

import React, { useMemo, useState } from "react";
import { ALBORA_BRAND } from "@albora/tokens";
import { Button, TextField } from "@albora/ui-web";

type Plan = "starter" | "studio" | "agency";

type Props = {
  afterCreate: "settings" | "event";
  requestedPlan?: Plan;
};

type Step = 1 | 2 | 3;
type Background = "light" | "dark";

const SLUG_RE = /^[a-z0-9-]{1,80}$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function derivarSlug(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

const steps = [
  { number: 1, title: "Sua operação", description: "Nome e endereço público" },
  { number: 2, title: "Sua identidade", description: "Cores e tema para começar" },
  { number: 3, title: "Próximo passo", description: "Configure ou crie um evento" },
] as const;

export function VendorOnboarding({ afterCreate, requestedPlan }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [accent, setAccent] = useState(ALBORA_BRAND.cores.acento);
  const [background, setBackground] = useState<Background>("dark");
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorSlug, setVendorSlug] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const nameValid = name.trim().length >= 2 && name.trim().length <= 120;
  const slugValid = SLUG_RE.test(slug);
  const accentValid = HEX_RE.test(accent);
  const canContinue = step === 1 ? nameValid && slugValid : accentValid;

  const progressLabel = useMemo(() => `Etapa ${step} de 3`, [step]);

  function setNameAndDerive(value: string) {
    setName(value);
    if (!slugTouched) setSlug(derivarSlug(value));
  }

  async function createVendor() {
    setStatus("saving");
    setError(null);
    try {
      const response = await fetch("/api/admin/vendor", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim(), slug }),
      });
      const body = (await response.json()) as { vendorId?: string; slug?: string; message?: string };
      if (!response.ok || !body.vendorId || !body.slug) {
        throw new Error(body.message ?? "Não foi possível criar o fornecedor");
      }
      setVendorId(body.vendorId);
      setVendorSlug(body.slug);
      setStep(2);
      setStatus("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar agora");
      setStatus("error");
    }
  }

  async function saveBrandAndContinue() {
    if (!vendorId) return;
    setStatus("saving");
    setError(null);
    try {
      const response = await fetch(`/api/vendors/${vendorId}/brand-tokens`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cores: { acento: accent }, background }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? "Não foi possível salvar a identidade");
      setStep(3);
      setStatus("idle");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível salvar agora");
      setStatus("error");
    }
  }

  function finish(destination: "settings" | "event") {
    if (!vendorId || !vendorSlug) return;
    if (destination === "event") {
      const params = new URLSearchParams({ vendor: vendorId, vendorSlug });
      if (requestedPlan) params.set("vendorPlan", requestedPlan);
      window.location.href = `/admin/new?${params.toString()}`;
      return;
    }
    window.location.href = `/admin/vendor/${vendorId}/settings`;
  }

  return (
    <div className="max-w-2xl">
      <ol className="mb-8 grid gap-3 sm:grid-cols-3" aria-label="Progresso da criação">
        {steps.map((item) => (
          <li
            key={item.number}
            className={`rounded-token border p-3 ${step === item.number ? "border-acento bg-superficie-alta" : step > item.number ? "border-acento/50 bg-superficie" : "border-linha bg-bg"}`}
            aria-current={step === item.number ? "step" : undefined}
          >
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-ink-2">
              {item.number} · {item.title}
            </p>
            <p className="m-0 mt-1 text-sm text-ink-2">{item.description}</p>
          </li>
        ))}
      </ol>

      <p className="mb-5 mt-0 text-sm text-ink-2" aria-live="polite">
        {progressLabel} · Você pode ajustar tudo depois.
      </p>

      {step === 1 && (
        <div className="flex max-w-md flex-col gap-6">
          <TextField
            id="vendor-onboarding-name"
            label="Nome do fornecedor"
            value={name}
            onChange={(event) => setNameAndDerive(event.target.value)}
            placeholder="ex: Studio Aurora"
            autoComplete="organization"
            hint="Este nome aparece no seu portal e nos eventos que você gerenciar."
          />
          <TextField
            id="vendor-onboarding-slug"
            label="Identificador (URL)"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value.trim().toLowerCase());
            }}
            placeholder="studio-aurora"
            hint="Use letras minúsculas, números e hífen."
            error={slug !== "" && !slugValid ? "Use só letras minúsculas, números e hífen." : undefined}
          />
          <Button type="button" disabled={!canContinue || status === "saving"} onClick={() => void createVendor()}>
            {status === "saving" ? "Criando…" : "Criar fornecedor"}
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_13rem]">
          <div className="flex flex-col gap-6">
            <div>
              <label htmlFor="vendor-onboarding-accent" className="mb-2 block font-titulo text-sm text-ink">
                Cor de destaque
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="vendor-onboarding-accent"
                  type="color"
                  value={accentValid ? accent : ALBORA_BRAND.cores.acento}
                  onChange={(event) => setAccent(event.target.value)}
                  className="h-11 w-11 cursor-pointer rounded-token border border-linha bg-bg p-1"
                  aria-label="Escolher cor de destaque"
                />
                <span className="text-sm text-ink-2">A mesma cor aparece nos seus eventos.</span>
              </div>
            </div>
            <fieldset>
              <legend className="mb-2 font-titulo text-sm text-ink">Tema inicial</legend>
              <div className="flex flex-wrap gap-3">
                {(["dark", "light"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBackground(value)}
                    aria-pressed={background === value}
                    className={`min-h-11 rounded-token border px-4 py-2 text-sm ${background === value ? "border-acento bg-superficie-alta text-ink" : "border-linha bg-bg text-ink-2"}`}
                  >
                    {value === "dark" ? "Profundo" : "Claro"}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="flex flex-wrap gap-3">
              <Button type="button" disabled={status === "saving"} onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button type="button" disabled={!canContinue || status === "saving"} onClick={() => void saveBrandAndContinue()}>
                {status === "saving" ? "Salvando…" : "Ver o próximo passo"}
              </Button>
            </div>
          </div>
          <div className="rounded-token border border-linha p-5" style={{ backgroundColor: background === "dark" ? "var(--cor-noite)" : "var(--cor-papel)" }}>
            <span className="mb-5 block h-8 w-8 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
            <p className="m-0 text-sm text-ink-2">Prévia da sua direção visual</p>
            <p className="mb-0 mt-2 font-titulo text-lg text-ink">{name || "Sua operação"}</p>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="max-w-xl rounded-token border border-linha bg-superficie p-6">
          <p className="m-0 text-sm font-semibold uppercase tracking-wide text-acento-texto">Tudo pronto</p>
          <h2 className="mb-2 mt-2 font-titulo text-2xl text-ink">{name} já tem uma base.</h2>
          <p className="mb-6 mt-0 text-ink-2">Agora você pode criar a primeira festa ou revisar cores, logo e endereço.</p>
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => finish("event")}>Criar meu primeiro evento</Button>
            <Button type="button" onClick={() => finish("settings")}>Abrir configurações</Button>
          </div>
        </div>
      )}

      {error && <p className="mt-5 text-sm text-critico" role="alert">{error}</p>}
    </div>
  );
}
