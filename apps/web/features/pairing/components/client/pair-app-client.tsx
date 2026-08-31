"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@albora/ui-web";

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
        router.replace(`/e/${encodeURIComponent(slug)}/cover`);
        return;
      }
      if (r.status === 409 || r.status === 422) setEstado("recusado");
      else setEstado("erro");
    } catch {
      setEstado("erro");
    }
  }

  return (
    <main className="fixed inset-0 grid place-items-center bg-bg p-6 font-corpo text-ink">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-superficie bg-superficie p-8">
        <h1 className="m-0 font-titulo text-2xl">Digite o código</h1>
        <p className="m-0 leading-normal text-ink-2">
          Quatro números que aparecem na web depois da primeira foto.
        </p>

        <div className="flex justify-center gap-3" aria-label="Código de pareamento">
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
              className="h-[3.75rem] w-[3.25rem] rounded-token border border-linha bg-bg p-0 text-center font-titulo text-[1.75rem] text-ink outline-none transition-[border-color] duration-[var(--tempo-rapido)] ease-[var(--curva)] focus:border-acento"
            />
          ))}
        </div>

        {estado === "recusado" && (
          <p className="m-0 text-[0.9rem] text-critico">
            Código inválido ou expirado. Peça outro na web.
          </p>
        )}
        {estado === "erro" && (
          <p className="m-0 text-[0.9rem] text-critico">
            Não deu para parear agora. Tente de novo.
          </p>
        )}

        <PrimaryButton
          onClick={() => void resgatar()}
          disabled={!valido || estado === "enviando" || estado === "ligado"}
        >
          {estado === "enviando" ? "Entrando…" : "Continuar"}
        </PrimaryButton>
      </div>
    </main>
  );
}
