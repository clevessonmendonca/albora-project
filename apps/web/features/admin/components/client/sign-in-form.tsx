"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Host panel sign-in (spec 009).
 *
 * Two screens on the same route: without `?m=`, the email form that requests
 * the link; with `?m=`, the button that confirms and opens the session. The
 * token is only consumed on click — never on load — so an email client's
 * prefetch cannot spend the link on its own.
 *
 * `?next=` (path under /admin) survives magic-link via the API and redirects
 * after Confirm — so Completo from the landing lands on the wizard with plano.
 */

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
        <p className="m-0 leading-normal text-ink-2">Se houver uma conta, o link de acesso está a caminho.</p>
        {devLink && (
          <a href={devLink} className="break-all text-acento">
            Abrir link (dev)
          </a>
        )}
      </Card>
    );
  }

  return (
    <Card title="Entrar no painel">
      <p className="m-0 leading-normal text-ink-2">Enviamos um link de acesso para o seu e-mail. Sem senha.</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@exemplo.com"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Seu e-mail"
        className="rounded-token border border-linha bg-bg px-4 py-3.5 text-base text-ink"
      />
      {status === "error" && <p className="m-0 text-[0.9rem] text-critico">Não deu para enviar agora. Tente de novo.</p>}
      <button
        type="button"
        onClick={() => void request()}
        disabled={!valid || status === "sending"}
        className={`cursor-pointer rounded-pilula border-none bg-acento px-4 py-3.5 font-titulo text-[1.05rem] text-sobre-acento ${
          valid && status !== "sending" ? "opacity-100" : "opacity-50"
        }`}
      >
        {status === "sending" ? "Enviando…" : "Enviar link"}
      </button>
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
      <p className="m-0 leading-normal text-ink-2">Toque para entrar no seu painel.</p>
      {status === "error" && <p className="m-0 text-[0.9rem] text-critico">Link inválido ou expirado. Peça outro.</p>}
      <button
        type="button"
        onClick={() => void signIn()}
        disabled={status === "signingIn"}
        className={`cursor-pointer rounded-pilula border-none bg-acento px-4 py-3.5 font-titulo text-[1.05rem] text-sobre-acento ${
          status === "signingIn" ? "opacity-50" : "opacity-100"
        }`}
      >
        {status === "signingIn" ? "Entrando…" : "Entrar"}
      </button>
    </Card>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="flex w-full max-w-[26rem] flex-col gap-5 rounded-superficie bg-superficie p-8">
        <h1 className="m-0 font-titulo text-2xl">{title}</h1>
        {children}
      </div>
    </main>
  );
}
