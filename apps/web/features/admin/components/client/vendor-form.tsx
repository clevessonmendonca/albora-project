"use client";

import React, { useState } from "react";
import { adminClasses } from "@/features/admin/components/server/admin-shell";

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

  const campoClasse =
    "w-full max-w-sm rounded-token border border-linha bg-bg px-3 py-[0.65rem] font-corpo text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento";

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void salvar();
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.8rem] uppercase tracking-rotulo text-ink-3" htmlFor="vendor-name">
          Nome do fornecedor
        </label>
        <input
          id="vendor-name"
          type="text"
          value={name}
          onChange={(e) => mudarNome(e.target.value)}
          placeholder="ex: Buffet da Serra"
          className={campoClasse}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[0.8rem] uppercase tracking-rotulo text-ink-3" htmlFor="vendor-slug">
          Identificador (URL)
        </label>
        <input
          id="vendor-slug"
          type="text"
          value={slug}
          onChange={(e) => mudarSlug(e.target.value)}
          placeholder="ex: buffet-da-serra"
          className={campoClasse}
        />
        {slug !== "" && !slugValido && (
          <p className="m-0 text-xs text-critico">
            Use só letras minúsculas, números e hífen.
          </p>
        )}
      </div>

      {status === "erro" && erro && <p className="m-0 text-sm text-critico">{erro}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={!podeSalvar}
          className={`${adminClasses.primaryButton} border-none ${
            !podeSalvar ? "cursor-not-allowed opacity-50" : ""
          }`}
        >
          {status === "salvando"
            ? "Salvando…"
            : props.mode === "create"
              ? "Criar fornecedor"
              : "Salvar"}
        </button>
        {salvo && <span className="text-sm text-acento-texto">✓ Salvo</span>}
      </div>
    </form>
  );
}
