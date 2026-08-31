"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

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
      <Card title="Verifique seu e-mail">
        <div className="flex items-start gap-3.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-acento text-sobre-acento">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden>
              <path
                d="M2.5 8l3.5 3.5L12.5 4"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <p className="m-0 leading-relaxed text-ink-2">
            Se houver uma conta associada, o link de acesso já está a caminho.
          </p>
        </div>
        {devLink && (
          <a href={devLink} className="break-all text-[0.85rem] text-acento">
            Abrir link (dev)
          </a>
        )}
        <button
          type="button"
          onClick={() => setStatus("editing")}
          className="cursor-pointer rounded-pilula border border-linha bg-transparent px-4 py-3 font-inherit text-[0.9rem] text-ink-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto"
        >
          Reenviar ou trocar e-mail
        </button>
      </Card>
    );
  }

  return (
    <Card title="Entrar no painel">
      <p className="m-0 leading-relaxed text-ink-2">
        Enviaremos um link de acesso para o seu e-mail. Nenhuma senha necessária.
      </p>
      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          void request();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[0.8rem] uppercase tracking-rotulo text-ink-3" htmlFor="email-input">
            Seu e-mail
          </label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="voce@exemplo.com"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="rounded-token border border-linha bg-bg px-4 py-3.5 text-base text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          />
        </div>
        {status === "error" && (
          <p className="m-0 text-[0.875rem] text-critico">
            Não conseguimos enviar agora. Por favor, tente novamente.
          </p>
        )}
        <button
          type="submit"
          disabled={!valid || status === "sending"}
          className={`cursor-pointer rounded-pilula border-none bg-acento px-4 py-3.5 font-titulo text-[1.05rem] text-sobre-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80 disabled:cursor-default ${
            valid && status !== "sending" ? "opacity-100" : "opacity-50"
          }`}
        >
          {status === "sending" ? "Enviando…" : "Enviar link"}
        </button>
      </form>
    </Card>
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
    <Card title="Confirmar acesso">
      <p className="m-0 leading-relaxed text-ink-2">
        Toque abaixo para confirmar e entrar no seu painel.
      </p>
      {status === "error" && (
        <p className="m-0 text-[0.875rem] text-critico">
          Este link está inválido ou expirou.{" "}
          <a href="/admin/sign-in" className="underline">
            Solicite um novo link.
          </a>
        </p>
      )}
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={status === "signingIn"}
        className={`cursor-pointer rounded-pilula border-none bg-acento px-4 py-3.5 font-titulo text-[1.05rem] text-sobre-acento transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:opacity-80 disabled:cursor-default ${
          status === "signingIn" ? "opacity-50" : "opacity-100"
        }`}
      >
        {status === "signingIn" ? "Entrando…" : "Entrar no painel"}
      </button>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="flex w-full max-w-[26rem] flex-col overflow-hidden rounded-superficie bg-superficie shadow-alta">
        <div className="h-[3px] bg-acento" />
        <div className="flex flex-col gap-6 px-9 py-9">
          <h1 className="m-0 font-titulo text-2xl font-light tracking-titulo">{title}</h1>
          {children}
        </div>
      </div>
    </main>
  );
}
