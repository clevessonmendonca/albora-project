"use client";

import { useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { raio } from "@/app/landing/pecas";
import { BotaoPrimario } from "@/app/telas/shell-convidado";

type Estado = "editando" | "enviando" | "ligado" | "recusado" | "erro";

const CASAS = 4;

export function PairApp() {
  const router = useRouter();
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [digitos, setDigitos] = useState<string[]>(() => Array(CASAS).fill(""));
  const [estado, setEstado] = useState<Estado>("editando");

  const codigo = digitos.join("");
  const valido = /^\d{4}$/.test(codigo);

  function atualizar(indice: number, valor: string) {
    const limpo = valor.replace(/\D/g, "").slice(-1);
    setDigitos((antes) => {
      const depois = [...antes];
      depois[indice] = limpo;
      return depois;
    });
    if (limpo && indice < CASAS - 1) {
      refs.current[indice + 1]?.focus();
    }
  }

  function onKeyDown(indice: number, ev: KeyboardEvent<HTMLInputElement>) {
    if (ev.key === "Backspace" && !digitos[indice] && indice > 0) {
      refs.current[indice - 1]?.focus();
    }
  }

  async function resgatar() {
    if (!valido) return;
    setEstado("enviando");
    try {
      const r = await fetch("/api/app/parear/resgatar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo }),
      });
      if (r.ok) {
        const { slug } = (await r.json()) as { slug: string };
        setEstado("ligado");
        router.replace(`/e/${encodeURIComponent(slug)}/capa`);
        return;
      }
      if (r.status === 409 || r.status === 422) setEstado("recusado");
      else setEstado("erro");
    } catch {
      setEstado("erro");
    }
  }

  const cartao: CSSProperties = {
    width: "min(28rem, 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
    padding: "2rem",
    backgroundColor: "var(--superficie)",
    ...raio("var(--raio-superficie)"),
  };

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
      <div style={cartao}>
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.5rem",
          }}
        >
          Digite o código
        </h1>
        <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.5 }}>
          Quatro números que aparecem na web depois da primeira foto.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.75rem",
          }}
          aria-label="Código de pareamento"
        >
          {digitos.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              onChange={(ev) => atualizar(i, ev.target.value)}
              onKeyDown={(ev) => onKeyDown(i, ev)}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={1}
              aria-label={`Dígito ${i + 1}`}
              style={{
                width: "3.25rem",
                height: "3.75rem",
                padding: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.75rem",
                textAlign: "center",
                color: "var(--ink)",
                backgroundColor: "var(--bg)",
                border: "1px solid var(--linha)",
                ...raio("var(--raio)"),
              }}
            />
          ))}
        </div>

        {estado === "recusado" && (
          <p style={{ margin: 0, color: "var(--critico)", fontSize: "0.9rem" }}>
            Código inválido ou expirado. Peça outro na web.
          </p>
        )}
        {estado === "erro" && (
          <p style={{ margin: 0, color: "var(--critico)", fontSize: "0.9rem" }}>
            Não deu para parear agora. Tente de novo.
          </p>
        )}

        <BotaoPrimario
          onClick={() => void resgatar()}
          desabilitado={!valido || estado === "enviando" || estado === "ligado"}
        >
          {estado === "enviando" ? "Entrando…" : "Continuar"}
        </BotaoPrimario>
      </div>
    </main>
  );
}
