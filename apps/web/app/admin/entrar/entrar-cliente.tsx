"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { raio } from "../../landing/pecas";

/**
 * Entrar no painel do anfitrião (spec 009).
 *
 * Duas telas na mesma rota: sem `?m=`, o formulário de e-mail que pede o link;
 * com `?m=`, o botão que confirma e abre a sessão. O token só é consumido no
 * clique — nunca no carregamento — para o pré-fetch de um cliente de e-mail não
 * gastar o link sozinho.
 */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Entrar({ magic }: { magic: string | null }) {
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
      <Cartao titulo="Verifique seu e-mail">
        <p style={corpo}>Se houver uma conta, o link de acesso está a caminho.</p>
        {linkDeDev && (
          <a href={linkDeDev} style={{ ...corpo, color: "var(--acento)", wordBreak: "break-all" }}>
            {/* Só em dev: sem e-mail, o link aparece aqui para clicar. */}
            Abrir link (dev)
          </a>
        )}
      </Cartao>
    );
  }

  return (
    <Cartao titulo="Entrar no painel">
      <p style={corpo}>Enviamos um link de acesso para o seu e-mail. Sem senha.</p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="voce@exemplo.com"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Seu e-mail"
        style={campo}
      />
      {estado === "erro" && <p style={aviso}>Não deu para enviar agora. Tente de novo.</p>}
      <button
        type="button"
        onClick={pedir}
        disabled={!valido || estado === "enviando"}
        style={{ ...botao, opacity: valido && estado !== "enviando" ? 1 : 0.5 }}
      >
        {estado === "enviando" ? "Enviando…" : "Enviar link"}
      </button>
    </Cartao>
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
    <Cartao titulo="Confirmar acesso">
      <p style={corpo}>Toque para entrar no seu painel.</p>
      {estado === "erro" && <p style={aviso}>Link inválido ou expirado. Peça outro.</p>}
      <button
        type="button"
        onClick={entrar}
        disabled={estado === "entrando"}
        style={{ ...botao, opacity: estado === "entrando" ? 0.5 : 1 }}
      >
        {estado === "entrando" ? "Entrando…" : "Entrar"}
      </button>
    </Cartao>
  );
}

const corpo: CSSProperties = { margin: 0, color: "var(--ink-2)", lineHeight: 1.5 };
const aviso: CSSProperties = { margin: 0, color: "var(--critico)", fontSize: "0.9rem" };
const campo: CSSProperties = {
  padding: "0.875rem 1rem",
  fontSize: "1rem",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--linha)",
  ...raio("var(--raio)"),
};
const botao: CSSProperties = {
  padding: "0.875rem 1rem",
  fontFamily: "var(--fonte-titulo)",
  fontSize: "1.05rem",
  color: "var(--sobre-acento)",
  backgroundColor: "var(--acento)",
  border: "none",
  cursor: "pointer",
  ...raio("var(--raio-pilula)"),
};

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        display: "grid",
        placeItems: "center",
        padding: "1.5rem",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <div
        style={{
          width: "min(26rem, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          padding: "2rem",
          backgroundColor: "var(--superficie)",
          ...raio("var(--raio-superficie)"),
        }}
      >
        <h1 style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.5rem" }}>{titulo}</h1>
        {children}
      </div>
    </main>
  );
}
