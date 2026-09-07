"use client";

import React, { useState } from "react";
import { PrimaryButton } from "@albora/ui-web";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail-como-acesso (ADR 0020, atrás da flag `delayedAuth`): sem linguagem de senha/cadastro.
 *  Reusa o magic link existente (`/api/admin/entrar`) — nenhum backend novo. Copy do REFATORACAO
 *  §2.4. O `next` leva de volta ao evento recém-criado depois de confirmar o acesso. */
export function AccessEmailStep({ eventId }: { eventId: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"editing" | "sending" | "sent" | "error">("editing");

  const valid = EMAIL_RE.test(email.trim());

  const enviar = async () => {
    if (!valid) return;
    setStatus("sending");
    try {
      const r = await fetch("/api/admin/entrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), next: `/admin/e/${eventId}` }),
      });
      setStatus(r.ok ? "sent" : "error");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col gap-1.5 rounded-token bg-superficie-alta px-4 py-4 text-center">
        <p className="tipo-subtitle m-0">Verifique seu e-mail</p>
        <p className="tipo-caption m-0 text-ink-2">
          Se houver uma conta associada, o link de acesso já está a caminho.
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-2.5 rounded-token border border-linha bg-superficie px-4 py-4"
      onSubmit={(e) => {
        e.preventDefault();
        void enviar();
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="acesso-email" className="tipo-subtitle m-0">
          Pra onde enviamos o acesso do seu evento?
        </label>
        <p className="tipo-caption m-0 text-ink-2">Sem senha — um link de acesso no seu e-mail.</p>
      </div>
      <input
        id="acesso-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@exemplo.com"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        disabled={status === "sending"}
        aria-invalid={status === "error" ? true : undefined}
        className="min-h-[46px] rounded-token border border-linha bg-bg px-3 py-2 text-ink outline-none focus-visible:border-acento-texto focus-visible:ring-2 focus-visible:ring-acento-texto"
      />
      {status === "error" && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          Não conseguimos enviar agora. Tente de novo.
        </p>
      )}
      <PrimaryButton type="submit" disabled={!valid || status === "sending"}>
        {status === "sending" ? "Enviando…" : "Enviar acesso"}
      </PrimaryButton>
      <p className="tipo-caption m-0 text-center text-ink-3">Você montou tudo isso sem criar conta.</p>
    </form>
  );
}
