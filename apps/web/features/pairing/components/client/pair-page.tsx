"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton, SecondaryButton } from "@albora/ui-web";

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
    <main className="flex min-h-dvh flex-col items-center justify-center bg-bg p-6 font-corpo text-ink">
      <div className="flex w-full max-w-md flex-col gap-5 rounded-superficie bg-superficie p-8">
        <h1 className="m-0 font-titulo text-2xl [text-wrap:balance]">Abra o app e digite</h1>

        {estado === "pronto" && codigo ? (
          <>
            <p className="m-0 leading-normal text-ink-2">
              Seu código vale poucos minutos. Digite no app para continuar com a mesma sessão.
            </p>
            <p
              aria-live="polite"
              className="m-0 text-center font-titulo text-[clamp(3rem,14vw,4.5rem)] tracking-[0.35em] text-acento [font-variant-numeric:tabular-nums]"
            >
              {codigo}
            </p>
            {expiraEm && (
              <p className="m-0 text-center text-[0.85rem] text-ink-3">
                Expira às {expiraEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            <SecondaryButton onClick={() => void gerar()}>Gerar outro código</SecondaryButton>
          </>
        ) : estado === "sem-sessao" ? (
          <p className="m-0 leading-normal text-ink-2">
            Entre no evento pelo QR da mesa antes de parear o app.
          </p>
        ) : estado === "erro" ? (
          <p className="m-0 text-critico">Não deu para gerar agora. Tente de novo.</p>
        ) : (
          <p className="m-0 text-ink-2">Gerando código…</p>
        )}

        {estado === "erro" && <PrimaryButton onClick={() => void gerar()}>Tentar de novo</PrimaryButton>}

        {estado === "sem-sessao" && (
          <PrimaryButton onClick={() => router.push(base)}>Entrar no evento</PrimaryButton>
        )}

        <SecondaryButton onClick={() => router.push(`${base}/cover`)}>Voltar à capa</SecondaryButton>
      </div>
    </main>
  );
}
