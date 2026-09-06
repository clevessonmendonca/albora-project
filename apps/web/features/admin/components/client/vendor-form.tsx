"use client";

import React, { useState } from "react";
import { Button, TextField } from "@albora/ui-web";

type Props =
  | { mode: "create" }
  | { mode: "edit"; vendorId: string; initialName: string; initialSlug: string };

const SLUG_RE = /^[a-z0-9-]{1,80}$/;

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

export function VendorForm(props: Props) {
  const [name, setName] = useState(props.mode === "edit" ? props.initialName : "");
  const [slug, setSlug] = useState(props.mode === "edit" ? props.initialSlug : "");
  const [slugTocado, setSlugTocado] = useState(props.mode === "edit");
  const [status, setStatus] = useState<"editing" | "salvando" | "erro">("editing");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const nomeValido = name.trim().length >= 2 && name.trim().length <= 120;
  const slugValido = SLUG_RE.test(slug);
  const podeSalvar = nomeValido && slugValido && status !== "salvando";

  const slugHint = !slugTocado ? "Segue o nome automaticamente até você editar." : undefined;
  const slugError =
    slug !== "" && !slugValido ? "Use só letras minúsculas, números e hífen." : undefined;

  function mudarNome(v: string) {
    setName(v);
    if (!slugTocado) setSlug(derivarSlug(v));
    setSalvo(false);
  }

  function mudarSlug(v: string) {
    setSlugTocado(true);
    setSlug(v.trim().toLowerCase());
    setSalvo(false);
  }

  async function salvar() {
    if (!podeSalvar) return;
    setStatus("salvando");
    setErro(null);

    const body = { name: name.trim(), slug };

    try {
      if (props.mode === "create") {
        const r = await fetch("/api/admin/vendor", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!r.ok) {
          const e = (await r.json()) as { message?: string };
          throw new Error(e.message ?? "Não foi possível criar o fornecedor");
        }
        const data = (await r.json()) as { vendorId: string };
        window.location.href = `/admin/vendor/${data.vendorId}/settings`;
        return;
      }

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
        {...(slugHint ? { hint: slugHint } : {})}
        {...(slugError ? { error: slugError } : {})}
      />

      {status === "erro" && erro && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          {erro}
        </p>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={!podeSalvar}>
          {status === "salvando"
            ? "Salvando…"
            : props.mode === "create"
              ? "Criar fornecedor"
              : "Salvar"}
        </Button>
        {salvo && <span className="tipo-caption text-acento-texto">✓ Salvo</span>}
      </div>
    </form>
  );
}
