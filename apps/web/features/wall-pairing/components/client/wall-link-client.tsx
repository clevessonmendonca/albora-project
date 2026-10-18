"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { radiusStyle } from "@albora/ui-web";

type Fase = "abrindo" | "invalido" | "erro";

export function WallLinkClient() {
  const [fase, setFase] = useState<Fase>("abrindo");

  useEffect(() => {
    const token = window.location.hash.replace(/^#/, "").trim();
    window.history.replaceState(null, "", window.location.pathname);
    if (!token) {
      setFase("invalido");
      return;
    }

    let vivo = true;
    void (async () => {
      try {
        const r = await fetch("/api/wall/pair/link", {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        if (!vivo) return;
        if (r.ok) window.location.replace("/wall-display");
        else if (r.status === 410 || r.status === 422) setFase("invalido");
        else setFase("erro");
      } catch {
        if (vivo) setFase("erro");
      }
    })();

    return () => {
      vivo = false;
    };
  }, []);

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div
        role="status"
        aria-live="polite"
        className="elev-2 flex w-[min(28rem,100%)] flex-col gap-4 p-[clamp(2rem,6vw,2.75rem)] text-center"
        style={radiusStyle("var(--raio-superficie)")}
      >
        {fase === "abrindo" && (
          <>
            <h1 className="tipo-title tipo-balance m-0 text-ink">Conectando o telão…</h1>
            <p className="tipo-body m-0 text-ink-2">Só um instante. As fotos da festa já vão aparecer.</p>
          </>
        )}
        {fase === "invalido" && (
          <>
            <h1 className="tipo-title tipo-balance m-0 text-ink">Este link não vale mais</h1>
            <p className="tipo-body m-0 text-ink-2">
              Ele expirou ou já foi usado. Peça um link novo a quem organiza a festa ou conecte pelo código na tela.
            </p>
            <Link href="/wall-display" className="tipo-caption text-acento underline">
              Conectar pelo código
            </Link>
          </>
        )}
        {fase === "erro" && (
          <>
            <h1 className="tipo-title tipo-balance m-0 text-ink">Não conseguimos conectar agora</h1>
            <p className="tipo-body m-0 text-ink-2">Verifique a internet desta tela e abra o link de novo.</p>
          </>
        )}
      </div>
    </main>
  );
}
