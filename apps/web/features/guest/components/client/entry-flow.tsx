"use client";

import type { EntryVia } from "@albora/core";
import { useEffect, useState } from "react";
import { registerServiceWorker } from "@/lib/register-sw";
import {
  PrimaryButton,
  SecondaryButton,
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
} from "@albora/ui-web";

/**
 * Do QR à sessão em três toques: consentir, digitar o nome, entrar.
 *
 * Layout espelha `EntryScreen` em `/telas` — uma pergunta por bloco, fundo
 * escuro, sem logotipo no topo (a festa é o herói, não a marca).
 */

const CONSENTIMENTO = "v1";
const NOME_SALVO = "albora:nome";

const TEXTO_CONSENTIMENTO_COMPLETO =
  "As fotos e vídeos que você enviar ficam visíveis para quem participa desta festa — no álbum, no feed e no telão, conforme os anfitriões liberarem. Seus dados ficam neste evento até o prazo de retenção definido pelos anfitriões. Você pode pedir a remoção das suas fotos a qualquer momento.";

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

  useEffect(() => {
    void registerServiceWorker();
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
    <GuestShell>
      <link rel="manifest" href={`/e/${encodeURIComponent(slug)}/manifest.webmanifest`} />

      {etapa === "recusou" ? (
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
      ) : (
        <form onSubmit={entrar} className="flex flex-1 flex-col">
          <EntryColumn>
            <div className="grid gap-3">
              <EventLabel>{nomeEvento}</EventLabel>
              <DisplayTitle>{saudacao}</DisplayTitle>
              <SecondaryText>Como você quer aparecer nas fotos que enviar?</SecondaryText>
            </div>

            <NameField value={nome} onChange={setNome} placeholder="Tio João" />

            <ConsentCheckbox checked={consentiu} onChange={setConsentiu}>
              Concordo que as fotos que eu enviar apareçam para quem está nesta festa.{" "}
              <TextLink onClick={() => setMostrarTextoCompleto((v) => !v)}>
                Ler o texto completo
              </TextLink>
            </ConsentCheckbox>

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

              <SecondaryButton type="button" onClick={() => setEtapa("recusou")}>
                Prefiro não
              </SecondaryButton>
            </div>

            {erro && <ErrorMessage>{erro}</ErrorMessage>}

            <FinePrint>Sem cadastro, sem senha e sem baixar nada</FinePrint>
          </EntryColumn>
        </form>
      )}
    </GuestShell>
  );
}
