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
    // Sem insistência, sem "tem certeza?", sem segunda tentativa disfarçada. A
    // volta é dela, e a frase do título promete que existe.
    return (
      <Tela
        rodape={
          <Botao variante="secundario" onClick={() => setEtapa("consentimento")}>
            Voltar
          </Botao>
        }
      >
        <Titulo>
          Tudo bem.
          <br />
          <em>Se mudar de ideia, é só voltar.</em>
        </Titulo>
        <Texto>Você não vai aparecer no álbum nem no telão.</Texto>
      </Tela>
    );
  }

  if (etapa === "consentimento") {
    return (
      <Tela
        rodape={
          <>
            <div style={{ display: "grid", gap: "0.6rem" }}>
              <Botao onClick={() => setEtapa("nome")}>Combinado</Botao>
              <Botao variante="secundario" onClick={() => setEtapa("recusou")}>
                Prefiro não
              </Botao>
            </div>
            <p style={META}>
              Consentimento {CONSENTIMENTO} · pack {packId}
            </p>
          </>
        }
      >
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
      </Tela>
    );
  }

  return (
    <Tela
      onSubmit={entrar}
      rodape={
        <>
          <Botao tipo="submit" desabilitado={enviando || nome.trim().length === 0}>
            {enviando ? "Entrando…" : "Continuar"}
          </Botao>

          {erro && (
            <p role="alert" style={RECADO}>
              {erro}
            </p>
          )}
        </>
      }
    >
      <Titulo>Como te chamamos?</Titulo>
      <Texto>Aparece junto das suas fotos, no telão e no álbum. Apelido serve.</Texto>

      {/* Serifada grande sobre um filete: escrever o próprio nome aqui parece
          assinar, não preencher cadastro. */}
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
      />
    </Tela>
  );
}

function Tela({
  children,
  rodape,
  onSubmit,
}: {
  children: React.ReactNode;
  rodape?: React.ReactNode | undefined;
  onSubmit?: ((e: React.FormEvent) => void) | undefined;
}) {
  const miolo = (
    <>
      {/* Único lugar do fluxo do convidado onde a marca aparece: é o primeiro
          contato, e daqui em diante a foto é a interface. */}
      <div style={{ flex: "none" }}>
        <Logotipo />
      </div>
      <span style={ESPACADOR} />
      <div>{children}</div>
      <span style={ESPACADOR} />
      <div style={{ flex: "none" }}>{rodape}</div>
    </>
  );

  return (
    <main style={TELA}>
      <style>{ESTILO}</style>

      {/* O React 19 iça isto para o `<head>`. Fica na rota do convidado, e não
          no layout raiz, porque o manifesto descreve o PWA do convidado — o
          admin e o telão não devem ser instaláveis como ele. */}
      <link rel="manifest" href="/manifest.webmanifest" />

      {onSubmit ? (
        <form onSubmit={onSubmit} style={COLUNA}>
          {miolo}
        </form>
      ) : (
        <div style={COLUNA}>{miolo}</div>
      )}
    </main>
  );
}

const TELA: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  justifyContent: "center",
  padding: "2.5rem 2rem 2.25rem",
  background: "var(--bg)",
  color: "var(--ink)",
  fontFamily: "var(--fonte-corpo)",
};

/**
 * Conteúdo no topo, ação no rodapé, vazio elástico no meio: é o que faz o alvo
 * ser inconfundível e o polegar chegar sem esticar.
 */
const COLUNA: React.CSSProperties = {
  flex: "1 1 auto",
  width: "100%",
  maxWidth: "26rem",
  display: "flex",
  flexDirection: "column",
};

const ESPACADOR: React.CSSProperties = { flex: "1 1 auto", minHeight: "1.5rem" };

const META: React.CSSProperties = {
  margin: "1.5rem 0 0",
  fontFamily: "var(--fonte-titulo)",
  fontSize: "0.62rem",
  fontWeight: 400,
  letterSpacing: "0.2em",
  textTransform: "uppercase",
  textAlign: "center",
  color: "var(--ink-3)",
};

const RECADO: React.CSSProperties = {
  margin: "0.9rem 0 0",
  fontSize: "0.85rem",
  lineHeight: 1.6,
  color: "var(--critico)",
};

const ESTILO = `
.entrada-titulo em { font-weight: 400; }

.entrada-campo {
  width: 100%;
  margin-top: 1.75rem;
  font-family: var(--fonte-titulo);
  font-size: clamp(1.6rem, 7.4vw, 1.875rem);
  font-weight: 400;
  letter-spacing: var(--tracking-titulo);
  line-height: 1.2;
  color: var(--ink);
  background: transparent;
  border: none;
  border-radius: 0;
  border-bottom: 1.5px solid var(--linha);
  padding: 0.7rem 0.125rem 0.9rem;
  min-height: 56px;
  outline: none;
  transition: border-color var(--tempo-rapido) var(--curva);
}
.entrada-campo::placeholder { color: var(--ink-3); font-style: italic; }
.entrada-campo:focus { border-bottom-color: var(--acento); }

.entrada-botao {
  font: inherit;
  font-size: 0.97rem;
  letter-spacing: var(--tracking-rotulo);
  border-radius: var(--raio-pilula);
  padding: 0 1.5rem;
  cursor: pointer;
  transition: transform var(--tempo-rapido) var(--curva), opacity var(--tempo-rapido) var(--curva);
}
.entrada-botao:disabled { cursor: default; }
.entrada-botao:active:not(:disabled) { transform: scale(0.972); }
.entrada-botao:focus-visible { outline: 1px solid var(--acento); outline-offset: 5px; }

@media (prefers-reduced-motion: reduce) {
  .entrada-campo, .entrada-botao { transition: none; }
  .entrada-botao:active:not(:disabled) { transform: none; }
}
`;

function Titulo({ children }: { children: React.ReactNode }) {
  return (
    <h1
      className="entrada-titulo"
      style={{
        fontFamily: "var(--fonte-titulo)",
        fontSize: "clamp(1.75rem, 8.2vw, 2.125rem)",
        fontWeight: 500,
        lineHeight: 1.14,
        letterSpacing: "var(--tracking-titulo)",
        margin: "0 0 0.85rem",
        textWrap: "balance",
      }}
    >
      {children}
    </h1>
  );
}

function Texto({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: 0, maxWidth: "34ch", color: "var(--ink-2)", fontSize: "0.94rem", lineHeight: 1.68 }}>
      {children}
    </p>
  );
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
      className="entrada-botao"
      type={tipo}
      onClick={onClick}
      disabled={desabilitado}
      style={{
        fontWeight: primario ? 500 : 400,
        // O alvo de toque tem de funcionar para a tia de 58 anos, às 22h, de
        // salto, com o celular numa mão só.
        minHeight: primario ? "56px" : "52px",
        width: "100%",
        opacity: desabilitado ? 0.4 : 1,
        background: primario ? "var(--ink)" : "transparent",
        color: primario ? "var(--bg)" : "var(--ink-2)",
        border: primario ? "none" : "1px solid var(--linha)",
      }}
    >
      {children}
    </button>
  );
}
