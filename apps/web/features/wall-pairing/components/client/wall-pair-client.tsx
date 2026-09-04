"use client";

import Link from "next/link";
import { useState } from "react";
import type { CSSProperties } from "react";
import { PrimaryButton, radiusStyle } from "@albora/ui-web";

/** Autoriza com a sessão — o evento sai dela, nunca do campo; o código só identifica o telão, não o evento. */

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
    gap: "1.75rem",
    padding: "clamp(2rem, 6vw, 2.75rem)",
    ...radiusStyle("var(--raio-superficie)"),
  };

  if (status === "connected") {
    return (
      <Shell>
        <div style={card} className="elev-2 parede-pair-entra">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-acento text-[1.75rem] text-sobre-acento shadow-acento">
            ✓
          </div>
          <div className="text-center">
            <h1 className="tipo-title tipo-balance m-0 text-ink">Telão ligado</h1>
            <p className="tipo-body m-0 mt-2 text-ink-2">
              As fotos publicadas já estão aparecendo na tela do salão.
            </p>
          </div>
          <Link
            href="/scan"
            className="tipo-caption block text-center text-acento no-underline transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-80"
          >
            Voltar ao evento
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div style={card} className="elev-2 parede-pair-entra">
        <div>
          <h1 className="tipo-title tipo-balance m-0 text-ink">Ligar o telão</h1>
          <p className="tipo-body m-0 mt-2 text-ink-2">
            Digite o código que aparece na tela do salão para autorizar.
          </p>
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
          className="min-h-12 border border-linha bg-bg px-4 py-3.5 text-center font-titulo text-[1.75rem] uppercase tracking-[0.35em] text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
          style={radiusStyle("var(--raio)")}
        />

        {status === "no-session" && (
          <p className="tipo-caption m-0 text-critico">
            Você precisa estar na festa para autorizar o telão.{" "}
            <Link href="/scan" className="underline">
              Entre pelo QR da mesa.
            </Link>
          </p>
        )}
        {status === "rejected" && (
          <p className="tipo-caption m-0 text-critico">
            Código inválido ou expirado. Verifique se digitou corretamente ou peça um novo código.
          </p>
        )}
        {status === "error" && (
          <p className="tipo-caption m-0 text-critico">
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <style>{`
        @keyframes parede-pair-entra {
          from { opacity: 0; transform: translateY(0.75rem); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .parede-pair-entra { animation: parede-pair-entra var(--tempo) var(--curva) both; }
        @media (prefers-reduced-motion: reduce) {
          .parede-pair-entra { animation: none !important; }
        }
      `}</style>
      {children}
    </main>
  );
}
