"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { raio } from "@/app/landing/pecas";
import { BotaoPrimario, BotaoSecundario } from "@/app/telas/shell-convidado";

type Estado = "carregando" | "pronto" | "sem-sessao" | "erro";

export function PairPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("carregando");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [expiraEm, setExpiraEm] = useState<Date | null>(null);
  const vivo = useRef(true);

  const gerar = useCallback(async () => {
    setEstado("carregando");
    try {
      const r = await fetch("/api/app/parear", {
        method: "POST",
        credentials: "same-origin",
      });
      if (r.status === 401) {
        if (vivo.current) setEstado("sem-sessao");
        return;
      }
      if (!r.ok) {
        if (vivo.current) setEstado("erro");
        return;
      }
      const corpo = (await r.json()) as { codigo: string; expiraEm: string };
      if (!vivo.current) return;
      setCodigo(corpo.codigo);
      setExpiraEm(new Date(corpo.expiraEm));
      setEstado("pronto");
    } catch {
      if (vivo.current) setEstado("erro");
    }
  }, []);

  useEffect(() => {
    vivo.current = true;
    void gerar();
    return () => {
      vivo.current = false;
    };
  }, [gerar]);

  const base = `/e/${encodeURIComponent(slug)}`;

  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      <div
        style={{
          width: "min(28rem, 100%)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          padding: "2rem",
          backgroundColor: "var(--superficie)",
          ...raio("var(--raio-superficie)"),
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.5rem",
            textWrap: "balance",
          }}
        >
          Abra o app e digite
        </h1>

        {estado === "pronto" && codigo ? (
          <>
            <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.5 }}>
              Seu código vale poucos minutos. Digite no app para continuar com a mesma sessão.
            </p>
            <p
              aria-live="polite"
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "clamp(3rem, 14vw, 4.5rem)",
                letterSpacing: "0.35em",
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
                color: "var(--acento)",
              }}
            >
              {codigo}
            </p>
            {expiraEm && (
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--ink-3)", textAlign: "center" }}>
                Expira às {expiraEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <BotaoSecundario onClick={() => void gerar()}>Gerar outro código</BotaoSecundario>
          </>
        ) : estado === "sem-sessao" ? (
          <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.5 }}>
            Entre no evento pelo QR da mesa antes de parear o app.
          </p>
        ) : estado === "erro" ? (
          <p style={{ margin: 0, color: "var(--critico)" }}>Não deu para gerar agora. Tente de novo.</p>
        ) : (
          <p style={{ margin: 0, color: "var(--ink-2)" }}>Gerando código…</p>
        )}

        {estado === "erro" && <BotaoPrimario onClick={() => void gerar()}>Tentar de novo</BotaoPrimario>}

        {estado === "sem-sessao" && (
          <BotaoPrimario onClick={() => router.push(base)}>Entrar no evento</BotaoPrimario>
        )}

        <BotaoSecundario onClick={() => router.push(`${base}/capa`)}>Voltar à capa</BotaoSecundario>
      </div>
    </main>
  );
}
