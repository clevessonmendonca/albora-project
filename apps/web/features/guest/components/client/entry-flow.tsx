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

/** Chegada é emocional (redesign v4 §3.2): a capa e o convite primeiro; nome e
 *  consentimento só depois de "Entrar na festa". O recado não vive aqui — virou
 *  story dos anfitriões. */
type Etapa = "chegada" | "identidade" | "recusou";

export function EntryFlow({
  eventoId,
  slug,
  nomeEvento,
  saudacao,
  via,
  comecaEm,
  coverImageUrl,
}: {
  eventoId: string;
  slug: string;
  nomeEvento: string;
  saudacao: string;
  via: EntryVia;
  comecaEm?: string;
  coverImageUrl?: string | null;
}) {
  const [etapa, setEtapa] = useState<Etapa>("chegada");
  const [nome, setNome] = useState("");
  const [consentiu, setConsentiu] = useState(true);
  const [mostrarTextoCompleto, setMostrarTextoCompleto] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Datas calculadas no cliente pra não arriscar descompasso de fuso/locale
  // entre o render do servidor e a hidratação (mesmo motivo do nome salvo).
  const [dataConsentimento, setDataConsentimento] = useState<string | null>(null);
  const [dataEvento, setDataEvento] = useState<string | null>(null);

  useEffect(() => {
    void registerServiceWorker();
    setDataConsentimento(
      new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long" }).format(new Date()),
    );
    if (comecaEm) {
      const d = new Date(comecaEm);
      if (!Number.isNaN(d.getTime())) {
        setDataEvento(
          new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" }).format(d),
        );
      }
    }
    try {
      const salvo = localStorage.getItem(NOME_SALVO);
      if (salvo) setNome(salvo);
    } catch {
      // Navegação privada — segue sem nome pré-preenchido.
    }
  }, [comecaEm]);

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
      <GuestShell hideStatusBar={etapa === "chegada"}>
        <style>{ENTRADA_MOTION_CSS}</style>
        <link rel="manifest" href={`/e/${encodeURIComponent(slug)}/manifest.webmanifest`} />

        {etapa === "chegada" && (
          <ArrivalScreen
            nomeEvento={nomeEvento}
            dataEvento={dataEvento}
            coverImageUrl={coverImageUrl ?? null}
            onEnter={() => setEtapa("identidade")}
          />
        )}

        {etapa === "recusou" && (
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
              <SecondaryButton onClick={() => setEtapa("identidade")}>Voltar</SecondaryButton>
            </EntryColumn>
          </div>
        )}

        {etapa === "identidade" && (
          <form onSubmit={entrar} className="entrada-anima flex flex-1 flex-col">
            <EntryColumn>
              <div>
                <EventLabel>Antes da sua primeira foto</EventLabel>
                <DisplayTitle>{saudacao}</DisplayTitle>
                <SecondaryText>Como você quer aparecer? Só o primeiro nome.</SecondaryText>
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
                  Suas fotos poderão aparecer no álbum e no telão deste evento.{" "}
                  <TextLink onClick={() => setMostrarTextoCompleto((v) => !v)}>
                    Ver detalhes
                  </TextLink>
                </ConsentCheckbox>

                <p className="m-0 pl-9 text-[0.6875rem] leading-snug text-ink-3">
                  Versão {CONSENTIMENTO}
                  {dataConsentimento ? ` · ${dataConsentimento}` : ""}
                </p>
              </Card>

              {mostrarTextoCompleto && <ConsentNote>{TEXTO_CONSENTIMENTO_COMPLETO}</ConsentNote>}

              <div className="grid gap-3">
                <PrimaryButton
                  type="submit"
                  disabled={enviando || nome.trim().length === 0 || !consentiu}
                >
                  {enviando ? "Entrando…" : "Continuar"}
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

/** Capa full-bleed emocional (§3.2). Foto do anfitrião quando existe; senão, chão do evento
 *  tingido — nunca gradiente fingindo foto. Scrim escuro só para o texto ser legível sobre a foto. */
function ArrivalScreen({
  nomeEvento,
  dataEvento,
  coverImageUrl,
  onEnter,
}: {
  nomeEvento: string;
  dataEvento: string | null;
  coverImageUrl: string | null;
  onEnter: () => void;
}) {
  return (
    <div id="main-content" className="entrada-anima relative flex min-h-dvh flex-col">
      {coverImageUrl ? (
        <img src={coverImageUrl} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-superficie-alta" />
      )}
      {/* Scrim para legibilidade do texto sobre a foto — chão do evento (dark), não preto cru. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-bg via-bg/70 to-bg/10" />

      <div className="relative mt-auto flex flex-col gap-5 px-7 pb-[max(3rem,env(safe-area-inset-bottom))] pt-16">
        <div className="flex flex-col gap-2">
          <EventLabel>Você foi convidado para</EventLabel>
          <DisplayTitle>{nomeEvento}</DisplayTitle>
          {dataEvento && <p className="m-0 text-[0.9375rem] text-ink-2">{dataEvento}</p>}
        </div>
        <PrimaryButton onClick={onEnter}>Entrar na festa</PrimaryButton>
        <FinePrint>Sem app · sem cadastro · sem baixar nada</FinePrint>
      </div>
    </div>
  );
}
