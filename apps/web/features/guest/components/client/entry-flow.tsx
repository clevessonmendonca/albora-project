"use client";

import type { EntryVia } from "@albora/core";
import { CONSENTIMENTO_ENTRADA_VIGENTE, textoDoConsentimento } from "@albora/core";
import React, { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/register-sw";
import {
  PrimaryButton,
  SecondaryButton,
  Button,
  Card,
  NameField,
  GuestShell,
  EntryColumn,
  ConsentCheckbox,
  TextLink,
  ConsentNote,
  ErrorMessage,
  FinePrint,
  EventLabel,
  SecondaryText,
  DisplayTitle,
  SkipLink,
} from "@albora/ui-web";

/**
 * Entrada suave da coluna — uma vez, na curva-base do produto (nunca a
 * mola de press/overlay). O kill-switch global de `prefers-reduced-motion`
 * (base.css) já zera durações; a media query aqui é redundância defensiva,
 * mesmo padrão do telão (`wall-client.tsx`).
 */
const ENTRADA_MOTION_CSS = `
  @keyframes entrada-subir { from { opacity: 0; transform: translateY(0.75rem); } to { opacity: 1; transform: translateY(0); } }
  .entrada-anima { animation: entrada-subir var(--tempo-lento) var(--curva) both; }
  @media (prefers-reduced-motion: reduce) { .entrada-anima { animation: none !important; } }
`;

// Fonte da verdade em @albora/core: mesmo texto que o painel de auditoria
// LGPD do anfitrião lê — divergir aqui faria a auditoria mentir sobre o que
// o convidado realmente aceitou.
const CONSENTIMENTO = CONSENTIMENTO_ENTRADA_VIGENTE;
const NOME_SALVO = "albora:nome";

const TEXTO_CONSENTIMENTO_COMPLETO =
  textoDoConsentimento("entrada", CONSENTIMENTO_ENTRADA_VIGENTE) ?? "";

type Etapa = "entrada" | "recusou";

export function EntryFlow({
  eventoId,
  slug,
  nomeEvento,
  saudacao,
  via,
}: {
  eventoId: string;
  slug: string;
  nomeEvento: string;
  saudacao: string;
  via: EntryVia;
}) {
  const [etapa, setEtapa] = useState<Etapa>("entrada");
  const [nome, setNome] = useState("");
  const [consentiu, setConsentiu] = useState(true);
  const [mostrarTextoCompleto, setMostrarTextoCompleto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Data discreta ao lado da versão do consentimento — calculada no cliente
  // pra não arriscar descompasso de fuso/locale entre o render do servidor
  // e a hidratação (o mesmo motivo do nome vindo de localStorage).
  const [dataConsentimento, setDataConsentimento] = useState<string | null>(null);

  useEffect(() => {
    void registerServiceWorker();
    setDataConsentimento(
      new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date()),
    );
    try {
      const salvo = localStorage.getItem(NOME_SALVO);
      if (salvo) setNome(salvo);
    } catch {
      // Navegação privada — segue sem nome pré-preenchido.
    }
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    if (!consentiu) return;

    setEnviando(true);
    setErro(null);

    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ eventoId, nome, consentimento: CONSENTIMENTO, via }),
      });

      if (!res.ok) {
        const corpo = (await res.json().catch(() => ({}))) as { code?: string };
        setErro(
          corpo.code === "limite.excedido"
            ? "Muita gente entrando ao mesmo tempo. Tente de novo em um minuto."
            : "Não consegui entrar. Tente de novo.",
        );
        return;
      }

      try {
        localStorage.setItem(NOME_SALVO, nome);
      } catch {
        // Navegação privada bloqueia. Não impede a entrada.
      }

      window.location.href = `/e/${encodeURIComponent(slug)}/cover`;
    } catch {
      setErro("Sem conexão. Chegue mais perto do roteador e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <SkipLink />
      <GuestShell>
      <style>{ENTRADA_MOTION_CSS}</style>
      <link rel="manifest" href={`/e/${encodeURIComponent(slug)}/manifest.webmanifest`} />

      {etapa === "recusou" ? (
        <div className="entrada-anima flex flex-1 flex-col">
          <EntryColumn>
            <div className="grid gap-4 text-center">
              <p className="m-0 font-titulo text-[1.5rem] leading-[1.2] tracking-titulo text-ink">
                Tudo bem.
              </p>
              <p className="m-0 text-[0.9375rem] leading-relaxed text-ink-3">
                Se mudar de ideia, é só voltar pelo QR da mesa.
              </p>
            </div>
            <SecondaryButton onClick={() => setEtapa("entrada")}>Voltar</SecondaryButton>
          </EntryColumn>
        </div>
      ) : (
        <form onSubmit={entrar} className="entrada-anima flex flex-1 flex-col">
          <EntryColumn>
            <div>
              <EventLabel>{nomeEvento}</EventLabel>
              <DisplayTitle>{saudacao}</DisplayTitle>
              <SecondaryText>Como você quer aparecer nas fotos que enviar?</SecondaryText>
            </div>

            <NameField
              value={nome}
              onChange={setNome}
              placeholder="Tio João"
              ariaLabel="Seu nome"
              autoFocus
            />

            <Card elevation={1} className="grid gap-3">
              <ConsentCheckbox checked={consentiu} onChange={setConsentiu}>
                Concordo que as fotos que eu enviar apareçam para quem está nesta festa.{" "}
                <TextLink onClick={() => setMostrarTextoCompleto((v) => !v)}>
                  Ler o texto completo
                </TextLink>
              </ConsentCheckbox>

              <p className="m-0 pl-9 text-[0.6875rem] leading-snug text-ink-3">
                Versão {CONSENTIMENTO}
                {dataConsentimento ? ` · ${dataConsentimento}` : ""}
              </p>
            </Card>

            {mostrarTextoCompleto && (
              <ConsentNote>{TEXTO_CONSENTIMENTO_COMPLETO}</ConsentNote>
            )}

            <div className="grid gap-3">
              <PrimaryButton
                type="submit"
                disabled={enviando || nome.trim().length === 0 || !consentiu}
              >
                {enviando ? "Entrando…" : "Fotografar"}
              </PrimaryButton>

              <Button type="button" variant="tertiary" size="sm" width="full" onClick={() => setEtapa("recusou")}>
                Prefiro não
              </Button>
            </div>

            {erro && <ErrorMessage>{erro}</ErrorMessage>}

            <FinePrint>Sem cadastro, sem senha e sem baixar nada</FinePrint>
          </EntryColumn>
        </form>
      )}
    </GuestShell>
    </>
  );
}
