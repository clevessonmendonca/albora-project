"use client";

import { PACKS, texto } from "@albora/packs";
import { useState } from "react";
import type { CSSProperties } from "react";
import { raio } from "../../landing/pecas";

/**
 * Criar evento (spec 009). Os packs vêm do registro e o nome de cada um sai da
 * sua própria vocabulário (`evento.nome`) — nenhuma string de domínio literal
 * no componente, que é o que o guard de packs exige.
 */
const OPCOES = Object.values(PACKS).map((p) => ({ id: p.id, nome: texto(p, "evento.nome") }));

type Criado = { slug: string; eventoId: string };

export function NovoEvento() {
  const [packId, setPackId] = useState(OPCOES[0]!.id);
  const [comeca, setComeca] = useState("");
  const [termina, setTermina] = useState("");
  const [estado, setEstado] = useState<"editando" | "criando" | "erro">("editando");
  const [criado, setCriado] = useState<Criado | null>(null);

  const valido = comeca !== "" && termina !== "" && termina > comeca;

  const criar = async () => {
    if (!valido) return;
    setEstado("criando");
    try {
      const r = await fetch("/api/admin/eventos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ packId, comecaEm: comeca, terminaEm: termina }),
      });
      if (!r.ok) return setEstado("erro");
      setCriado((await r.json()) as Criado);
    } catch {
      setEstado("erro");
    }
  };

  if (criado) return <Resultado criado={criado} />;

  return (
    <Cartao titulo="Criar evento">
      <label style={rotulo}>
        Tipo de evento
        <select value={packId} onChange={(e) => setPackId(e.target.value)} style={campo}>
          {OPCOES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </select>
      </label>

      <label style={rotulo}>
        Começo
        <input type="datetime-local" value={comeca} onChange={(e) => setComeca(e.target.value)} style={campo} />
      </label>

      <label style={rotulo}>
        Fim
        <input type="datetime-local" value={termina} onChange={(e) => setTermina(e.target.value)} style={campo} />
      </label>

      {estado === "erro" && <p style={aviso}>Não deu para criar agora. Confira as datas e tente de novo.</p>}

      <button
        type="button"
        onClick={criar}
        disabled={!valido || estado === "criando"}
        style={{ ...botao, opacity: valido && estado !== "criando" ? 1 : 0.5 }}
      >
        {estado === "criando" ? "Criando…" : "Criar evento"}
      </button>
    </Cartao>
  );
}

function Resultado({ criado }: { criado: Criado }) {
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <Cartao titulo="Evento criado">
      <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.5 }}>
        Imprima o QR do link do convidado na mesa. Abra o telão numa TV do salão e
        pareie com o código que aparece nela.
      </p>
      <Link titulo="Link do convidado (QR)" url={`${origem}/e/${criado.slug}`} />
      <Link titulo="Telão do salão" url={`${origem}/telao`} />
      <a href="/admin" style={{ ...botao, textAlign: "center", textDecoration: "none" }}>
        Voltar ao painel
      </a>
    </Cartao>
  );
}

function Link({ titulo, url }: { titulo: string; url: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <span style={{ fontSize: "0.8rem", color: "var(--ink-3)", letterSpacing: "var(--tracking-rotulo)", textTransform: "uppercase" }}>
        {titulo}
      </span>
      <a href={url} style={{ color: "var(--acento)", wordBreak: "break-all", fontSize: "0.95rem" }}>
        {url}
      </a>
    </div>
  );
}

const rotulo: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.4rem",
  fontSize: "0.9rem",
  color: "var(--ink-2)",
};
const campo: CSSProperties = {
  padding: "0.75rem 0.9rem",
  fontSize: "1rem",
  color: "var(--ink)",
  backgroundColor: "var(--bg)",
  border: "1px solid var(--linha)",
  ...raio("var(--raio)"),
};
const aviso: CSSProperties = { margin: 0, color: "var(--critico)", fontSize: "0.9rem" };
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
        overflowY: "auto",
      }}
    >
      <div
        style={{
          width: "min(28rem, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "1.1rem",
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
