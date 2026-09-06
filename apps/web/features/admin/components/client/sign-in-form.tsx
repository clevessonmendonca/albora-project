"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { PrimaryButton, SecondaryButton, TextField } from "@albora/ui-web";
import { AlboraLogo } from "@/features/guest/components/client/albora-logo";

/** Token consumed on click, not load — email prefetch cannot spend the magic link. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Only same-origin admin paths — blocks open redirects. */
export function safeAdminNext(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const next = raw.trim();
  if (!next.startsWith("/admin")) return null;
  if (next.startsWith("//") || next.includes("://")) return null;
  if (next.includes("\\")) return null;
  return next;
}

export function SignInForm({ magic }: { magic: string | null }) {
  const search = useSearchParams();
  const next = safeAdminNext(search.get("next"));
  return magic ? <Confirm token={magic} next={next} /> : <RequestLink next={next} />;
}

function RequestLink({ next }: { next: string | null }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"editing" | "sending" | "sent" | "error">("editing");
  const [devLink, setDevLink] = useState<string | null>(null);

  const valid = EMAIL.test(email.trim());

  const request = async () => {
    if (!valid) return;
    setStatus("sending");
    try {
      const r = await fetch("/api/admin/entrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), ...(next ? { next } : {}) }),
      });
      if (!r.ok) return setStatus("error");
      const body = (await r.json()) as { enviado: boolean; link?: string };
      setDevLink(body.link ?? null);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  if (status === "sent") {
    return (
      <SignInPanel>
        <div className="flex items-start gap-3.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pilula bg-acento text-sobre-acento"
            aria-hidden
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path
                d="M2.5 8l3.5 3.5L12.5 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div className="flex flex-col gap-1.5">
            <h1 className="tipo-title m-0">Verifique seu e-mail</h1>
            <p className="tipo-body m-0 text-ink-2">
              Se houver uma conta associada, o link de acesso já está a caminho.
            </p>
          </div>
        </div>
        {devLink && (
          <a href={devLink} className="tipo-caption break-all text-acento-texto">
            Abrir link (dev)
          </a>
        )}
        <SecondaryButton onClick={() => setStatus("editing")}>
          Reenviar ou trocar e-mail
        </SecondaryButton>
      </SignInPanel>
    );
  }

  return (
    <SignInPanel>
      <div className="flex flex-col gap-1.5">
        <h1 className="tipo-title m-0">Entrar no painel</h1>
        <p className="tipo-body m-0 text-ink-2">
          Enviaremos um link de acesso para o seu e-mail. Nenhuma senha necessária.
        </p>
      </div>
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void request();
        }}
      >
        <TextField
          id="email-input"
          label="Seu e-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="voce@exemplo.com"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={status === "sending"}
        />
        {status === "error" && (
          <p role="alert" className="tipo-caption m-0 text-critico">
            Não conseguimos enviar agora. Por favor, tente novamente.
          </p>
        )}
        <PrimaryButton type="submit" disabled={!valid || status === "sending"}>
          {status === "sending" ? "Enviando…" : "Enviar link"}
        </PrimaryButton>
      </form>
    </SignInPanel>
  );
}

function Confirm({ token, next }: { token: string; next: string | null }) {
  const [status, setStatus] = useState<"ready" | "signingIn" | "error">("ready");

  const signIn = async () => {
    setStatus("signingIn");
    try {
      const r = await fetch("/api/admin/sessao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) {
        window.location.assign(next ?? "/admin");
        return;
      }
      setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  return (
    <SignInPanel>
      <div className="flex flex-col gap-1.5">
        <h1 className="tipo-title m-0">Confirmar acesso</h1>
        <p className="tipo-body m-0 text-ink-2">
          Toque abaixo para confirmar e entrar no seu painel.
        </p>
      </div>
      {status === "error" && (
        <p role="alert" className="tipo-caption m-0 text-critico">
          Este link está inválido ou expirou.{" "}
          <a href="/admin/sign-in" className="text-acento-texto underline">
            Solicite um novo link.
          </a>
        </p>
      )}
      <PrimaryButton onClick={() => void signIn()} disabled={status === "signingIn"}>
        {status === "signingIn" ? "Entrando…" : "Entrar no painel"}
      </PrimaryButton>
    </SignInPanel>
  );
}

/** Sem AdminShell — é a porta antes do login, então a marca aparece aqui em vez do header do painel. */
function SignInPanel({ children }: { children: ReactNode }) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="flex w-full max-w-[26rem] flex-col items-center gap-8">
        <AlboraLogo width="7.5rem" />
        <div className="elev-2 flex w-full flex-col gap-6 rounded-superficie border border-linha px-8 py-9">
          {children}
        </div>
      </div>
    </main>
  );
}
