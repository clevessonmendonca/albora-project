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
    gap: "1.25rem",
    padding: "2rem",
    backgroundColor: "var(--superficie)",
    ...radiusStyle("var(--raio-superficie)"),
  };

  if (status === "connected") {
    return (
      <Shell>
        <div style={card}>
          <h1 style={titleStyle}>Telão ligado</h1>
          <p style={bodyStyle}>As fotos publicadas já estão aparecendo na tela do salão.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={card}>
        <h1 style={titleStyle}>Ligar o telão</h1>
        <p style={bodyStyle}>Digite o código que aparece na tela do salão.</p>

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
          className="border border-linha bg-bg px-4 py-3.5 text-center font-titulo text-[1.75rem] uppercase tracking-[0.35em] text-ink"
          style={radiusStyle("var(--raio)")}
        />

        {status === "no-session" && (
          <p style={alertStyle}>Entre no evento pelo QR da mesa antes de ligar o telão.</p>
        )}
        {status === "rejected" && (
          <p style={alertStyle}>Código inválido ou expirado. Confira na tela.</p>
        )}
        {status === "error" && (
          <p style={alertStyle}>Não deu para ligar agora. Tente de novo.</p>
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
  color: "var(--ink)",
};
const bodyStyle: CSSProperties = { margin: 0, color: "var(--ink-2)", lineHeight: 1.5 };
const alertStyle: CSSProperties = { margin: 0, color: "var(--critico)", fontSize: "0.9rem" };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      {children}
    </main>
  );
}
