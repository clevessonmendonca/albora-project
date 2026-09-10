"use client";

import React, { useState } from "react";
import { Button, TextField } from "@albora/ui-web";
import { VendorOnboarding } from "./vendor-onboarding";

type Props =
  | {
      mode: "create";
      afterCreate?: "settings" | "event";
      requestedPlan?: "starter" | "studio" | "agency";
    }
  | { mode: "edit"; vendorId: string; initialName: string; initialSlug: string };

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

export function VendorForm(props: Props) {
  if (props.mode === "create") {
    return (
      <VendorOnboarding
        afterCreate={props.afterCreate ?? "settings"}
        {...(props.requestedPlan ? { requestedPlan: props.requestedPlan } : {})}
      />
    );
  }
  return <VendorEditForm {...props} />;
}

function VendorEditForm(props: Extract<Props, { mode: "edit" }>) {
  const [name, setName] = useState(props.initialName);
  const [slug, setSlug] = useState(props.initialSlug);
  const [status, setStatus] = useState<"editing" | "salvando" | "erro">("editing");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const nomeValido = name.trim().length >= 2 && name.trim().length <= 120;
  const slugValido = SLUG_RE.test(slug);
  const podeSalvar = nomeValido && slugValido && status !== "salvando";

  const slugError =
    slug !== "" && !slugValido ? "Use só letras minúsculas, números e hífen." : undefined;

  function mudarNome(v: string) {
    setName(v);
    setSalvo(false);
  }

  function mudarSlug(v: string) {
    setSlug(v.trim().toLowerCase());
    setSalvo(false);
  }

  async function salvar() {
    if (!podeSalvar) return;
    setStatus("salvando");
    setErro(null);

    const body = { name: name.trim(), slug };

    try {
      const r = await fetch(`/api/admin/vendor/${props.vendorId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const e = (await r.json()) as { message?: string };
        throw new Error(e.message ?? "Não foi possível salvar");
      }
      setSalvo(true);
      setStatus("editing");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar agora");
      setStatus("erro");
    }
  }

  return (
    <form
      className="flex max-w-sm flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar();
      }}
    >
      <TextField
        id="vendor-name"
        label="Nome do fornecedor"
        value={name}
        onChange={(e) => mudarNome(e.target.value)}
        placeholder="ex: Buffet da Serra"
        autoComplete="organization"
      />

      <TextField
        id="vendor-slug"
        label="Identificador (URL)"
        value={slug}
        onChange={(e) => mudarSlug(e.target.value)}
        placeholder="ex: buffet-da-serra"
        {...(slugError ? { error: slugError } : {})}
      />

      {status === "erro" && erro && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          {erro}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={!podeSalvar}>
          {status === "salvando" ? "Salvando…" : "Salvar"}
        </Button>
        {salvo && <span className="tipo-caption text-acento-texto">✓ Salvo</span>}
      </div>
    </form>
  );
}
