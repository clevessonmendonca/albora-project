"use client";

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
}: {
  eventoId: string;
  slug: string;
  nomeEvento: string;
  saudacao: string;
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
        body: JSON.stringify({ eventoId, nome, consentimento: CONSENTIMENTO }),
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
      <link rel="manifest" href="/manifest.webmanifest" />

      {etapa === "recusou" ? (
        <EntryColumn>
          <DisplayTitle>
            Tudo bem.
            <br />
            <em>Se mudar de ideia, é só voltar.</em>
          </DisplayTitle>
          <SecondaryText>Você não vai aparecer no álbum nem no telão.</SecondaryText>
          <SecondaryButton onClick={() => setEtapa("entrada")}>Voltar</SecondaryButton>
        </EntryColumn>
      ) : (
        <form onSubmit={entrar} className="flex flex-1 flex-col">
          <EntryColumn>
            <div>
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

            <PrimaryButton
              type="submit"
              disabled={enviando || nome.trim().length === 0 || !consentiu}
            >
              {enviando ? "Entrando…" : "Fotografar"}
            </PrimaryButton>

            <SecondaryButton type="button" onClick={() => setEtapa("recusou")}>
              Prefiro não
            </SecondaryButton>

            {erro && <ErrorMessage>{erro}</ErrorMessage>}

            <FinePrint>Sem cadastro, sem senha e sem baixar nada</FinePrint>
          </EntryColumn>
        </form>
      )}
    </GuestShell>
  );
}
