"use client";

import { useEffect, useState } from "react";
import { registrarServiceWorker } from "@/lib/registrar-sw";
import {
  BotaoPrimario,
  BotaoSecundario,
  CampoNome,
  ChaoConvidado,
  ColunaEntrada,
  Consentimento,
  LinkDiscreto,
  RecadoConsentimento,
  RecadoErro,
  RodapeDiscreto,
  RotuloEvento,
  TextoSecundario,
  TituloGrande,
} from "../../telas/shell-convidado";

/**
 * Do QR à sessão em três toques: consentir, digitar o nome, entrar.
 *
 * Layout espelha `TelaEntrada` em `/telas` — uma pergunta por bloco, fundo
 * escuro, sem logotipo no topo (a festa é o herói, não a marca).
 */

const CONSENTIMENTO = "v1";
const NOME_SALVO = "albora:nome";

const TEXTO_CONSENTIMENTO_COMPLETO =
  "As fotos e vídeos que você enviar ficam visíveis para quem participa desta festa — no álbum, no feed e no telão, conforme os anfitriões liberarem. Seus dados ficam neste evento até o prazo de retenção definido pelos anfitriões. Você pode pedir a remoção das suas fotos a qualquer momento.";

type Etapa = "entrada" | "recusou";

export function Entrada({
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
    void registrarServiceWorker();
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

      window.location.href = `/e/${slug}/foto`;
    } catch {
      setErro("Sem conexão. Chegue mais perto do roteador e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ChaoConvidado>
      <link rel="manifest" href="/manifest.webmanifest" />

      {etapa === "recusou" ? (
        <ColunaEntrada>
          <TituloGrande>
            Tudo bem.
            <br />
            <em>Se mudar de ideia, é só voltar.</em>
          </TituloGrande>
          <TextoSecundario>Você não vai aparecer no álbum nem no telão.</TextoSecundario>
          <BotaoSecundario onClick={() => setEtapa("entrada")}>Voltar</BotaoSecundario>
        </ColunaEntrada>
      ) : (
        <form onSubmit={entrar} style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <ColunaEntrada>
            <div>
              <RotuloEvento>{nomeEvento}</RotuloEvento>
              <TituloGrande>{saudacao}</TituloGrande>
              <TextoSecundario>Como você quer aparecer nas fotos que enviar?</TextoSecundario>
            </div>

            <CampoNome valor={nome} onChange={setNome} placeholder="Tio João" />

            <Consentimento marcado={consentiu} onChange={setConsentiu}>
              Concordo que as fotos que eu enviar apareçam para quem está nesta festa.{" "}
              <LinkDiscreto onClick={() => setMostrarTextoCompleto((v) => !v)}>
                Ler o texto completo
              </LinkDiscreto>
            </Consentimento>

            {mostrarTextoCompleto && (
              <RecadoConsentimento>{TEXTO_CONSENTIMENTO_COMPLETO}</RecadoConsentimento>
            )}

            <BotaoPrimario
              tipo="submit"
              desabilitado={enviando || nome.trim().length === 0 || !consentiu}
            >
              {enviando ? "Entrando…" : "Fotografar"}
            </BotaoPrimario>

            <BotaoSecundario tipo="button" onClick={() => setEtapa("recusou")}>
              Prefiro não
            </BotaoSecundario>

            {erro && <RecadoErro>{erro}</RecadoErro>}

            <RodapeDiscreto>Sem cadastro, sem senha e sem baixar nada</RodapeDiscreto>
          </ColunaEntrada>
        </form>
      )}
    </ChaoConvidado>
  );
}
