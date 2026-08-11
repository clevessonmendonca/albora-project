"use client";

import { useEffect, useState } from "react";
import { registrarServiceWorker } from "@/lib/registrar-sw";
import { Logotipo } from "./logotipo";

/**
 * Do QR à sessão em três toques: consentir, digitar o nome, entrar.
 *
 * Cada toque a mais aqui custa participação, e participação é a única métrica
 * que decide o produto. Não há login, não há e-mail, não há confirmação — e
 * não vai haver.
 */

const CONSENTIMENTO = "v1";
const NOME_SALVO = "albora:nome";

type Etapa = "consentimento" | "nome" | "recusou";

export function Entrada({
  eventoId,
  packId,
  slug,
}: {
  eventoId: string;
  packId: string;
  slug: string;
}) {
  const [etapa, setEtapa] = useState<Etapa>("consentimento");
  const [nome, setNome] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Passo 2 do §3.1: em segundo plano, sem `await` e sem estado na tela. O
    // que decide o negócio é a primeira foto — ela não espera pelo registro,
    // e uma falha aqui não pode virar erro visível (N6.2).
    void registrarServiceWorker();
  }, []);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
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

      // O nome fica no aparelho para a segunda foto não perguntar de novo.
      // A sessão já vive no cookie; isto é só para a tela.
      try {
        localStorage.setItem(NOME_SALVO, nome);
      } catch {
        // Navegação privada bloqueia. Não é motivo para impedir a entrada.
      }

      // Direto para a câmera: o terceiro toque termina com a foto podendo
      // ser tirada, não com uma tela de parabéns.
      window.location.href = `/e/${slug}/foto`;
    } catch {
      setErro("Sem conexão. Chegue mais perto do roteador e tente de novo.");
    } finally {
      setEnviando(false);
    }
  }

  if (etapa === "recusou") {
    return (
      <Tela>
        <Titulo>
          Tudo bem.
          <br />
          <em>Se mudar de ideia, é só voltar.</em>
        </Titulo>
        <Texto>Você não vai aparecer no álbum nem no telão.</Texto>

        {/* Sem insistência, sem "tem certeza?", sem segunda tentativa
            disfarçada. A volta é dela, e a frase acima promete que existe. */}
        <div style={{ display: "grid", marginTop: "1.75rem" }}>
          <Botao variante="secundario" onClick={() => setEtapa("consentimento")}>
            Voltar
          </Botao>
        </div>
      </Tela>
    );
  }

  if (etapa === "consentimento") {
    return (
      <Tela>
        <Titulo>
          Tira foto.
          <br />
          <em>A gente cuida do resto.</em>
        </Titulo>
        {/* Texto jurídico versionado por CONSENTIMENTO. Trocar a frase sem
            virar a versão invalida o consentimento já coletado. */}
        <Texto>
          O que você fotografar aqui vai para o álbum de quem te convidou, e pode aparecer no
          telão. Você pode apagar as suas a qualquer momento.
        </Texto>

        <div style={{ display: "grid", gap: "0.6rem", marginTop: "1.75rem" }}>
          <Botao onClick={() => setEtapa("nome")}>Combinado</Botao>
          <Botao variante="secundario" onClick={() => setEtapa("recusou")}>
            Prefiro não
          </Botao>
        </div>

        <p style={{ marginTop: "1.25rem", fontSize: "0.78rem", color: "var(--ink-3)" }}>
          Consentimento {CONSENTIMENTO} · pack {packId}
        </p>
      </Tela>
    );
  }

  return (
    <Tela>
      <Titulo>Como te chamamos?</Titulo>
      <Texto>Aparece junto das suas fotos, no telão e no álbum. Apelido serve.</Texto>

      <style>{ESTILO_CAMPO}</style>

      <form onSubmit={entrar} style={{ display: "grid", gap: "0.75rem", marginTop: "1.5rem" }}>
        <input
          className="entrada-campo"
          value={nome}
          onChange={(ev) => setNome(ev.target.value)}
          placeholder="Tio João"
          maxLength={40}
          required
          autoFocus
          autoComplete="given-name"
          enterKeyHint="go"
          style={{
            font: "inherit",
            fontSize: "1.05rem",
            padding: "0.85rem 1rem",
            borderRadius: "var(--raio)",
            border: "1px solid var(--linha)",
            background: "transparent",
            color: "var(--ink)",
            minHeight: "48px",
          }}
        />

        <Botao tipo="submit" desabilitado={enviando || nome.trim().length === 0}>
          {enviando ? "Entrando…" : "Continuar"}
        </Botao>

        {erro && (
          <p role="alert" style={{ margin: 0, fontSize: "0.85rem", color: "var(--critico)" }}>
            {erro}
          </p>
        )}
      </form>
    </Tela>
  );
}

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <main
      style={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        padding: "2rem 1.5rem",
        background: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
      }}
    >
      {/* O React 19 iça isto para o `<head>`. Fica na rota do convidado, e não
          no layout raiz, porque o manifesto descreve o PWA do convidado — o
          admin e o telão não devem ser instaláveis como ele. */}
      <link rel="manifest" href="/manifest.webmanifest" />
      <div style={{ width: "100%", maxWidth: "24rem" }}>
        {/* Único lugar do fluxo do convidado onde a marca aparece: é o primeiro
            contato, e daqui em diante a foto é a interface. */}
        <div style={{ marginBottom: "2.25rem" }}>
          <Logotipo />
        </div>
        {children}
      </div>
    </main>
  );
}

const ESTILO_CAMPO = `
.entrada-campo::placeholder { color: var(--ink-3); font-style: italic; }
.entrada-campo:focus-visible { outline: 1px solid var(--acento); outline-offset: 3px; }
`;

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h1
      style={{
        fontFamily: "var(--fonte-titulo)",
        fontSize: "1.7rem",
        fontWeight: 500,
        lineHeight: 1.2,
        margin: "0 0 0.75rem",
        textWrap: "balance",
      }}
    >
      {children}
    </h1>
  );
}

function Texto({ children }: { children: React.ReactNode }) {
  return <p style={{ margin: 0, color: "var(--ink-2)", lineHeight: 1.6 }}>{children}</p>;
}

function Botao({
  children,
  onClick,
  tipo = "button",
  variante = "primario",
  desabilitado,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  tipo?: "button" | "submit";
  variante?: "primario" | "secundario";
  desabilitado?: boolean;
}) {
  const primario = variante === "primario";

  return (
    <button
      type={tipo}
      onClick={onClick}
      disabled={desabilitado}
      style={{
        font: "inherit",
        fontSize: "1rem",
        fontWeight: 500,
        // 48px: o alvo de toque tem de funcionar para a tia de 58 anos, às
        // 22h, de salto, com o celular numa mão só.
        minHeight: "48px",
        padding: "0 1.25rem",
        borderRadius: "var(--raio)",
        cursor: desabilitado ? "default" : "pointer",
        opacity: desabilitado ? 0.45 : 1,
        background: primario ? "var(--ink)" : "transparent",
        color: primario ? "var(--bg)" : "var(--ink)",
        border: primario
          ? "none"
          : "1px solid var(--linha)",
      }}
    >
      {children}
    </button>
  );
}
