"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { PrimaryButton, radiusStyle } from "@albora/ui-web";

/**
 * A tela que liga o telão (spec 010).
 *
 * Aberta por quem já está no evento — pelo QR do telão (código pré-preenchido)
 * ou digitando o código nas configurações. Autoriza com a **sessão** de quem
 * está aqui; o evento sai dela, nunca do campo. Consentir é ligar: expor as
 * fotos publicadas numa tela do salão é decisão de quem toca o botão.
 */

const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;

type Status = "editing" | "submitting" | "connected" | "no-session" | "rejected" | "error";

export function WallPairClient({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<Status>("editing");

  const valid = CODE_PATTERN.test(code.trim().toUpperCase());

  const connect = async () => {
    if (!valid) return;
    setStatus("submitting");
    try {
      const r = await fetch("/api/wall/authorize", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ codigo: code.trim().toUpperCase() }),
      });
      if (r.ok) setStatus("connected");
      else if (r.status === 401) setStatus("no-session");
      else if (r.status === 409 || r.status === 422) setStatus("rejected");
      else setStatus("error");
    } catch {
      setStatus("error");
    }
  };

  const card: CSSProperties = {
    width: "min(28rem, 100%)",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    padding: "2.5rem",
    backgroundColor: "var(--superficie)",
    ...radiusStyle("var(--raio-superficie)"),
  };

  if (status === "connected") {
    return (
      <Shell>
        <div style={card}>
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-acento text-[1.75rem] text-sobre-acento">
            ✓
          </div>
          <div className="text-center">
            <h1 style={titleStyle}>Telão ligado</h1>
            <p style={bodyStyle}>
              As fotos publicadas já estão aparecendo na tela do salão. Você pode fechar esta aba.
            </p>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={card}>
        <div>
          <h1 style={titleStyle}>Ligar o telão</h1>
          <p style={bodyStyle}>Digite o código que aparece na tela do salão para autorizar.</p>
        </div>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={6}
          placeholder="A2C4E6"
          aria-label="Código do telão"
          className="border border-linha bg-bg px-4 py-3.5 text-center font-titulo text-[1.75rem] uppercase tracking-[0.35em] text-ink outline-none focus:border-acento"
          style={radiusStyle("var(--raio)")}
        />

        {status === "no-session" && (
          <p style={alertStyle}>
            Você precisa estar na festa para autorizar o telão. Entre pelo QR da mesa primeiro.
          </p>
        )}
        {status === "rejected" && (
          <p style={alertStyle}>
            Código inválido ou expirado. Verifique se digitou corretamente ou peça um novo código.
          </p>
        )}
        {status === "error" && (
          <p style={alertStyle}>
            Não conseguimos conectar agora. Verifique sua conexão e tente novamente.
          </p>
        )}

        <PrimaryButton
          onClick={() => void connect()}
          disabled={!valid || status === "submitting"}
        >
          {status === "submitting" ? "Ligando…" : "Ligar o telão"}
        </PrimaryButton>
      </div>
    </Shell>
  );
}

const titleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--fonte-titulo)",
  fontSize: "1.5rem",
  lineHeight: 1.2,
  color: "var(--ink)",
};
const bodyStyle: CSSProperties = {
  margin: 0,
  marginTop: "0.5rem",
  color: "var(--ink-2)",
  fontSize: "0.9375rem",
  lineHeight: 1.5,
};
const alertStyle: CSSProperties = {
  margin: 0,
  color: "var(--critico)",
  fontSize: "0.875rem",
  lineHeight: 1.4,
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      {children}
    </main>
  );
}
