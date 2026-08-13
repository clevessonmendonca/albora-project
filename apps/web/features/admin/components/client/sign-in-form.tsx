"use client";

import { useState } from "react";

/**
 * Entrar no painel do anfitrião (spec 009).
 *
 * Duas telas na mesma rota: sem `?m=`, o formulário de e-mail que pede o link;
 * com `?m=`, o botão que confirma e abre a sessão. O token só é consumido no
 * clique — nunca no carregamento — para o pré-fetch de um cliente de e-mail não
 * gastar o link sozinho.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({ magic }: { magic: string | null }) {
  return magic ? <Confirmar token={magic} /> : <PedirLink />;
}

function PedirLink() {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"editando" | "enviando" | "enviado" | "erro">("editando");
  const [linkDeDev, setLinkDeDev] = useState<string | null>(null);

  const valido = EMAIL.test(email.trim());

  const pedir = async () => {
    if (!valido) return;
    setEstado("enviando");
    try {
      const r = await fetch("/api/admin/entrar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!r.ok) return setEstado("erro");
      const corpo = (await r.json()) as { enviado: boolean; link?: string };
      setLinkDeDev(corpo.link ?? null);
      setEstado("enviado");
    } catch {
      setEstado("erro");
    }
  };

  if (estado === "enviado") {
    return (
      <Card titulo="Verifique seu e-mail">
        <p className="m-0 leading-normal text-ink-2">Se houver uma conta, o link de acesso está a caminho.</p>
        {linkDeDev && (
          <a href={linkDeDev} className="break-all text-acento">
            {/* Só em dev: sem e-mail, o link aparece aqui para clicar. */}
            Abrir link (dev)
          </a>
        )}
      </Card>
    );
  }

  return (
    <Card titulo="Entrar no painel">
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
      {estado === "erro" && <p className="m-0 text-[0.9rem] text-critico">Não deu para enviar agora. Tente de novo.</p>}
      <button
        type="button"
        onClick={pedir}
        disabled={!valido || estado === "enviando"}
        className={`cursor-pointer rounded-pilula border-none bg-acento px-4 py-3.5 font-titulo text-[1.05rem] text-sobre-acento ${
          valido && estado !== "enviando" ? "opacity-100" : "opacity-50"
        }`}
      >
        {estado === "enviando" ? "Enviando…" : "Enviar link"}
      </button>
    </Card>
  );
}

function Confirmar({ token }: { token: string }) {
  const [estado, setEstado] = useState<"pronto" | "entrando" | "erro">("pronto");

  const entrar = async () => {
    setEstado("entrando");
    try {
      const r = await fetch("/api/admin/sessao", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (r.ok) {
        window.location.assign("/admin");
        return;
      }
      setEstado("erro");
    } catch {
      setEstado("erro");
    }
  };

  return (
    <Card titulo="Confirmar acesso">
      <p className="m-0 leading-normal text-ink-2">Toque para entrar no seu painel.</p>
      {estado === "erro" && <p className="m-0 text-[0.9rem] text-critico">Link inválido ou expirado. Peça outro.</p>}
      <button
        type="button"
        onClick={entrar}
        disabled={estado === "entrando"}
        className={`cursor-pointer rounded-pilula border-none bg-acento px-4 py-3.5 font-titulo text-[1.05rem] text-sobre-acento ${
          estado === "entrando" ? "opacity-50" : "opacity-100"
        }`}
      >
        {estado === "entrando" ? "Entrando…" : "Entrar"}
      </button>
    </Card>
  );
}

function Card({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="flex w-full max-w-[26rem] flex-col gap-5 rounded-superficie bg-superficie p-8">
        <h1 className="m-0 font-titulo text-2xl">{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
