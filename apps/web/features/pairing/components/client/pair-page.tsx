"use client";

import {
  appPairSchemeLinkPassagem,
  appPairUniversalLinkPassagem,
} from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  GuestHeader,
  GuestMain,
  GuestShell,
  PrimaryButton,
  SecondaryButton,
  SkipLink,
} from "@albora/ui-web";

type Estado = "carregando" | "pronto" | "sem-sessao" | "erro";

export function PairPage({ slug }: { slug: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>("carregando");
  const [codigo, setCodigo] = useState<string | null>(null);
  const [passagem, setPassagem] = useState<string | null>(null);
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
      const corpo = (await r.json()) as { codigo: string; expiraEm: string; passagem?: string };
      if (!vivo.current) return;
      setCodigo(corpo.codigo);
      setPassagem(typeof corpo.passagem === "string" ? corpo.passagem : null);
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
  const webOrigin = typeof window !== "undefined" ? window.location.origin : "https://albora.app";
  const appLink = passagem ? appPairSchemeLinkPassagem(passagem) : null;
  const universalLink = passagem ? appPairUniversalLinkPassagem(webOrigin, slug, passagem) : null;

  return (
    <>
      <SkipLink />
      <GuestShell>
        <GuestMain reserveTabBarSpace={false}>
          <GuestHeader title="Parear o app" homeHref={`${base}/cover`} />
          <div className="flex flex-1 flex-col justify-center gap-5 py-6">
        <h1 className="tipo-title tipo-balance m-0 text-ink">Abra o app e digite</h1>

        {estado === "pronto" && codigo ? (
          <>
            <p className="m-0 tipo-body text-ink-2">
              Com o app instalado, toque abaixo — zero digitação. Sem o app, digite os quatro números na
              primeira abertura.
            </p>
            <Card elevation={1} className="grid gap-2 text-center">
              <p
                aria-live="polite"
                className="m-0 font-titulo text-[clamp(3rem,14vw,4.5rem)] tracking-[0.35em] text-acento [font-variant-numeric:tabular-nums]"
              >
                {codigo}
              </p>
              {expiraEm && (
                <p className="m-0 tipo-caption text-ink-3">
                  Expira às {expiraEm.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              )}
            </Card>
            {appLink ? (
              <PrimaryButton
                onClick={() => {
                  window.location.href = appLink;
                }}
              >
                Abrir no app
              </PrimaryButton>
            ) : null}
            {universalLink ? (
              <a
                href={universalLink}
                className="m-0 text-center tipo-caption text-ink-3 underline decoration-ink-3/40 underline-offset-2 transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
              >
                Link universal (quando o domínio estiver verificado)
              </a>
            ) : null}
            <SecondaryButton onClick={() => void gerar()}>Gerar outro código</SecondaryButton>
          </>
        ) : estado === "sem-sessao" ? (
          <p className="m-0 tipo-body text-ink-2">
            Entre no evento pelo QR da mesa antes de parear o app.
          </p>
        ) : estado === "erro" ? (
          <p className="m-0 tipo-body text-critico">Não deu para gerar agora. Tente de novo.</p>
        ) : (
          <p className="m-0 tipo-body text-ink-2">Gerando código…</p>
        )}

        {estado === "erro" && <PrimaryButton onClick={() => void gerar()}>Tentar de novo</PrimaryButton>}

        {estado === "sem-sessao" && (
          <PrimaryButton onClick={() => router.push(base)}>Entrar no evento</PrimaryButton>
        )}

        <SecondaryButton onClick={() => router.push(`${base}/cover`)}>Voltar à capa</SecondaryButton>
        <a
          href="/privacidade"
          className="m-0 text-center tipo-caption text-ink-3 underline decoration-ink-3/40 underline-offset-2 transition-opacity duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-70"
        >
          Privacidade
        </a>
          </div>
        </GuestMain>
      </GuestShell>
    </>
  );
}
