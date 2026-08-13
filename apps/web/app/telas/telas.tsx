import {
  MODELOS_DE_TELAO,
  PERFIS,
  padroesDoEvento,
  problemasDaEscolha,
  type ModeloDeTelao,
} from "@albora/core";
import { texto, type Pack } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";
import { Moldura, raio } from "../landing/pecas";
import {
  BarraDeAbas,
  BarraDeStatus,
  BotaoFlutuante,
  Estrela,
  IconeComentario,
  IconeCompartilhar,
  IconeGrade,
  IconeMais,
  IconePessoa,
  IconePilha,
  IconeVoltar,
  Pilula,
} from "./pecas-de-tela";
import {
  AvisoGate,
  BotaoPrimario,
  BotaoSecundario,
  ColunaEntrada,
  Consentimento,
  FaixaMissao,
  LinkDiscreto,
  PADDING_LATERAL,
  RodapeDiscreto,
  RotuloEvento,
  TextoSecundario,
  TituloGrande,
} from "./shell-convidado";

/**
 * As telas do convidado, do anfitrião e do telão.
 *
 * Três regras do `CLAUDE.md` decidem quase tudo o que se vê aqui, e nenhuma
 * é de gosto:
 *
 * 1. **O convidado não tem login.** Não há tela de conta, de senha nem de
 *    recuperação, e a primeira foto é alcançável do QR sem nada disso.
 * 2. **A interação abre por gate.** Antes da hora que o anfitrião escolheu,
 *    a aba do feed mostra a parede espelhada e o envio, e só. Reação e
 *    comentário não existem na tela, em vez de existirem desabilitados.
 * 3. **Coração, aliança e pombinha são anti-padrão.** A reação usa a estrela
 *    da marca, que mantém o gesto do Instagram sem o clichê.
 * 4. **Nada corta na vertical.** A parede tem oito modelos e sete deles
 *    aceitam foto em pé; quem decide quais entram é o anfitrião, e a escolha
 *    que deixaria só `cheio` é recusada por `problemasDaEscolha`.
 *
 * Não há aba de planejamento. Cronograma, local e traje são fase 4, e a dots
 * os coloca em primeiro plano — copiar isso seria vender o que não existe.
 */

function Chao({
  children,
  fundo,
  pack,
}: {
  children: ReactNode;
  fundo: "claro" | "escuro";
  pack: Pack;
}) {
  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: { ...pack.tokens, fundo } });

  return (
    <div
      style={{
        ...(paraVariaveis(tokens) as CSSProperties),
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
        lineHeight: 1.5,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function Cabecalho({ titulo, acao }: { titulo: string; acao?: ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
        padding: "0.375rem 1.125rem 0.875rem",
      }}
    >
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "1.125rem",
          letterSpacing: "var(--tracking-titulo)",
        }}
      >
        {titulo}
      </span>
      {acao}
    </div>
  );
}

/* ── convidado ──────────────────────────────────────────────────────── */

/**
 * A entrada: uma pergunta por tela.
 *
 * Quatro toques do QR até a primeira foto é a promessa da landing, e ela só
 * se sustenta se nenhuma tela pedir duas coisas. O consentimento é datado e
 * versionado antes de qualquer captura, e por isso ele é passo, não rodapé.
 */
export function TelaEntrada({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <ColunaEntrada>
        <div>
          <RotuloEvento>{texto(pack, "landing.exemplo.nome")}</RotuloEvento>
          <TituloGrande>{texto(pack, "convidado.saudacao")}</TituloGrande>
          <TextoSecundario>Como você quer aparecer nas fotos que enviar?</TextoSecundario>
        </div>

        <div
          style={{
            padding: "1.0625rem 1.125rem",
            ...raio("var(--raio)"),
            backgroundColor: "var(--superficie)",
            borderBottomWidth: "2px",
            borderBottomStyle: "solid",
            borderBottomColor: "var(--acento)",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.375rem",
          }}
        >
          Bia
          <span style={{ color: "var(--acento)" }}>|</span>
        </div>

        <Consentimento marcado>
          Concordo que as fotos que eu enviar apareçam para quem está nesta festa.{" "}
          <LinkDiscreto>Ler o texto completo</LinkDiscreto>
        </Consentimento>

        <BotaoPrimario desabilitado>Fotografar</BotaoPrimario>

        <RodapeDiscreto>Sem cadastro, sem senha e sem baixar nada</RodapeDiscreto>
      </ColunaEntrada>
    </Chao>
  );
}

/** A-01 · Scanner — visor ao vivo antes de entrar no evento. */
export function TelaScanner({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <div style={{ position: "relative", flex: 1, backgroundColor: "var(--superficie)" }}>
        <Moldura rotulo="" raio="0" atmosfera variante={2} />
        <span
          style={{
            position: "absolute",
            inset: "18%",
            border: "1px solid var(--acento)",
            borderRadius: "var(--raio)",
            boxShadow: "0 0 0 9999px color-mix(in srgb, var(--noite) 35%, transparent)",
          }}
        />
        <p
          style={{
            position: "absolute",
            top: "1rem",
            left: "1.125rem",
            right: "1.125rem",
            margin: 0,
            textAlign: "center",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.0625rem",
            textShadow: "0 1px 4px var(--bg)",
          }}
        >
          Aponte para o QR da festa
        </p>
      </div>
      <div style={{ padding: "1rem 1.125rem 2rem" }}>
        <BotaoSecundario>Já tenho o link</BotaoSecundario>
      </div>
    </Chao>
  );
}

/**
 * A câmera, com a missão em cima do visor.
 *
 * A missão aparece **dentro** da tela de fotografar e não numa aba separada:
 * quem está com uma taça na outra mão não navega até um convite, e uma missão
 * que exige navegação deixa de ser convite e vira tarefa.
 */
export function TelaCamera({ pack, missao }: { pack: Pack; missao: string }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <Cabecalho
        titulo={texto(pack, "landing.exemplo.nome")}
        acao={<Pilula>3 na fila</Pilula>}
      />

      <div style={{ position: "relative", flex: 1, margin: "0 0.75rem", overflow: "hidden", ...raio("var(--raio-superficie)") }}>
        <Moldura rotulo="" raio="var(--raio-superficie)" atmosfera variante={3} />

        <div style={{ position: "absolute", top: "0.875rem", left: "0.875rem", right: "0.875rem" }}>
          <FaixaMissao indice={3} total={4} titulo={missao} />
        </div>

        <div
          style={{
            position: "absolute",
            left: "0.875rem",
            right: "0.875rem",
            bottom: "0.875rem",
            display: "flex",
            gap: "0.4375rem",
            flexWrap: "wrap",
          }}
        >
          {pack.lugares.slice(0, 4).map((l, i) => (
            <Pilula key={l.id} ativa={i === 0}>
              {texto(pack, l.chaveTitulo)}
            </Pilula>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          padding: "1.25rem 1.75rem 2.25rem",
        }}
      >
        <span style={{ display: "flex", gap: "0.4375rem" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ position: "relative", width: "1.875rem", height: "1.875rem", ...raio("0.5rem"), overflow: "hidden" }}>
              <Moldura rotulo="" raio="0.5rem" atmosfera variante={i * 4} />
            </span>
          ))}
        </span>

        <span
          style={{
            justifySelf: "center",
            display: "grid",
            placeItems: "center",
            width: "4.5rem",
            height: "4.5rem",
            borderRadius: "50%",
            borderWidth: "3px",
            borderStyle: "solid",
            borderColor: "var(--ink)",
          }}
        >
          <span style={{ width: "3.625rem", height: "3.625rem", borderRadius: "50%", backgroundColor: "var(--acento)" }} />
        </span>

        <span style={{ justifySelf: "end", fontSize: "0.75rem", color: "var(--ink-3)" }}>Rolo</span>
      </div>
    </Chao>
  );
}

/**
 * A aba de missões — card da missão de agora e trilha do progresso.
 *
 * A missão também aparece sobre o visor da câmera; esta aba existe para quem
 * quer ver o que falta sem abrir o obturador. Gamificação de placar fica fora.
 */
export function TelaMissoes({ pack }: { pack: Pack }) {
  const titulos = pack.missoes.slice(0, 4).map((m) => texto(pack, m.chaveTitulo));
  const atual = titulos[2] ?? texto(pack, "missao.livre");

  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <Cabecalho titulo="Missões" acao={<Pilula>3 de 4</Pilula>} />

      <div style={{ padding: "0 1.125rem", display: "grid", gap: "1rem", flex: 1, alignContent: "start" }}>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            padding: "1.25rem 1.125rem",
            ...raio("var(--raio)"),
            backgroundColor: "color-mix(in srgb, var(--acento) 14%, var(--superficie))",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "color-mix(in srgb, var(--acento) 35%, var(--linha))",
          }}
        >
          <span
            style={{
              fontSize: "0.6875rem",
              letterSpacing: "var(--tracking-rotulo)",
              textTransform: "uppercase",
              color: "var(--acento-texto)",
            }}
          >
            Missão de agora
          </span>
          <span
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "1.375rem",
              lineHeight: 1.15,
              letterSpacing: "var(--tracking-titulo)",
            }}
          >
            {atual}
          </span>
          <span style={{ fontSize: "0.8125rem", color: "var(--ink-2)" }}>Toque para fotografar</span>
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.5rem" }}>
          {titulos.map((t, i) => {
            const feita = i < 2;
            return (
              <li
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.875rem",
                  padding: "0.875rem 1rem",
                  ...raio("var(--raio)"),
                  backgroundColor: "var(--superficie)",
                  opacity: feita ? 0.72 : 1,
                }}
              >
                <Estrela tamanho={18} cheia={feita} />
                <span style={{ fontFamily: "var(--fonte-titulo)", fontSize: "1rem", lineHeight: 1.25 }}>
                  {t}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <BarraDeAbas ativa="missoes" />
    </Chao>
  );
}

/**
 * O feed, depois do gate.
 *
 * A trilha de cima são os capítulos da noite, não pessoas: o Instagram põe
 * contas ali porque a rede é entre pessoas, e a Albora não é rede nenhuma —
 * o feed vive dentro de um evento e morre com ele.
 */
export function TelaFeed({ pack, momentos }: { pack: Pack; momentos: string[] }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <Cabecalho
        titulo={texto(pack, "landing.exemplo.nome")}
        acao={<Pilula>847 fotos</Pilula>}
      />

      <div style={{ display: "flex", gap: "0.875rem", padding: "0 1.125rem 1rem", overflow: "hidden" }}>
        {momentos.slice(0, 4).map((m, i) => (
          <span key={m} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.375rem", flex: "none", width: "3.75rem" }}>
            <span
              style={{
                position: "relative",
                width: "3.5rem",
                height: "3.5rem",
                borderRadius: "50%",
                padding: "2px",
                backgroundColor: i < 2 ? "var(--acento)" : "var(--linha)",
              }}
            >
              <span style={{ position: "relative", display: "block", width: "100%", height: "100%", borderRadius: "50%", overflow: "hidden" }}>
                <Moldura rotulo="" raio="50%" atmosfera variante={i * 5} />
              </span>
            </span>
            <span style={{ fontSize: "0.5625rem", color: "var(--ink-2)", textAlign: "center", lineHeight: 1.2 }}>
              {m}
            </span>
          </span>
        ))}
      </div>

      <div style={{ flex: 1, overflow: "hidden", borderTop: "1px solid var(--linha)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.875rem 1.125rem" }}>
          <span style={{ display: "grid", placeItems: "center", width: "1.875rem", height: "1.875rem", borderRadius: "50%", backgroundColor: "var(--superficie-alta)", fontSize: "0.75rem" }}>
            BI
          </span>
          <span style={{ flex: 1, fontSize: "0.84375rem" }}>Bia</span>
          <span style={{ fontSize: "0.6875rem", color: "var(--ink-3)" }}>23h · Pista</span>
        </div>

        <div style={{ position: "relative", aspectRatio: "4 / 5", marginBottom: "0.75rem" }}>
          <Moldura rotulo="" raio="0rem" atmosfera variante={7} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.125rem", padding: "0 1.125rem 0.625rem", color: "var(--ink)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <Estrela tamanho={24} cheia />
            <span style={{ fontSize: "0.84375rem" }}>12</span>
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <IconeComentario tamanho={22} />
            <span style={{ fontSize: "0.84375rem" }}>3</span>
          </span>
          {/* Compartilhar só aparece na foto de quem a enviou:
              `autorizarCompartilhamento` nega `nao_e_autor`, e desenhar o ícone
              na foto alheia prometeria uma ação que o núcleo recusa. */}
          <span style={{ marginLeft: "auto" }}>
            <IconeCompartilhar tamanho={21} />
          </span>
        </div>

        <p style={{ margin: "0 1.125rem", fontSize: "0.84375rem", lineHeight: 1.45, color: "var(--ink-2)" }}>
          <span style={{ color: "var(--ink)" }}>Tio João</span> essa é a melhor da noite
        </p>
      </div>

      <BarraDeAbas ativa="feed" />
    </Chao>
  );
}

/** Foto aberta em tela cheia — spec A-04. Destino de toque no feed, álbum ou minhas. */
export function TelaFotoAberta({ pack }: { pack: Pack }) {
  const veuTopo = "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 86%, transparent), transparent)";
  const veuBase = "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent)";

  return (
    <Chao fundo="escuro" pack={pack}>
      <div
        style={{
          position: "relative",
          flex: 1,
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", inset: 0 }}>
          <Moldura rotulo="" raio="0" atmosfera variante={11} />
        </div>

        <header
          style={{
            position: "relative",
            zIndex: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "max(0.75rem, env(safe-area-inset-top)) 1rem 1rem",
            background: veuTopo,
          }}
        >
          <span
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.7rem",
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
            }}
          >
            23h
          </span>
          <span style={{ display: "flex", gap: "0.5rem" }}>
            <BotaoFlutuante aria-hidden>×</BotaoFlutuante>
            <BotaoFlutuante>Fechar</BotaoFlutuante>
          </span>
        </header>

        <div style={{ position: "relative", zIndex: 1 }} />

        <footer
          style={{
            position: "relative",
            zIndex: 2,
            display: "grid",
            gap: "1rem",
            padding: "2rem 1rem max(1.25rem, env(safe-area-inset-bottom))",
            background: veuBase,
          }}
        >
          <div style={{ display: "grid", gap: "0.3rem" }}>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "0.66rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "var(--ink)",
              }}
            >
              Bia · Pista
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1.125rem", color: "var(--ink)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <Estrela tamanho={24} cheia />
                <span style={{ fontSize: "0.84375rem" }}>12</span>
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
                <IconeComentario tamanho={22} />
                <span style={{ fontSize: "0.84375rem" }}>3</span>
              </span>
              <span style={{ marginLeft: "auto", display: "flex", gap: "0.75rem" }}>
                <IconeCompartilhar tamanho={21} />
                <IconeMais tamanho={20} />
              </span>
            </div>
          </div>
          <BotaoPrimario>Tirar foto</BotaoPrimario>
        </footer>
      </div>
    </Chao>
  );
}

/** A-07 · Fila de envio — sheet sobre a câmera, caminho crítico offline. */
export function TelaFila({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <Cabecalho
        titulo={texto(pack, "landing.exemplo.nome")}
        acao={<Pilula>3 na fila</Pilula>}
      />

      <div style={{ position: "relative", flex: 1, margin: "0 0.75rem", overflow: "hidden", ...raio("var(--raio-superficie)") }}>
        <Moldura rotulo="" raio="var(--raio-superficie)" atmosfera variante={3} />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "grid",
          placeItems: "end center",
          padding: "1rem",
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          background: "color-mix(in srgb, var(--noite) 45%, transparent)",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            width: "min(26rem, 100%)",
            padding: "1.25rem",
            display: "grid",
            gap: "0.875rem",
            ...raio("var(--raio-superficie)"),
            backgroundColor: "var(--superficie)",
            border: "1px solid var(--linha)",
          }}
        >
          <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem" }}>
            Fila de envio
          </p>
          <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
            Sem sinal — a gente reenvia sozinho quando voltar.
          </p>
          {[
            { tipo: "Foto", estado: "Enviando…" },
            { tipo: "Foto", estado: "Na fila · sem sinal" },
            { tipo: "Vídeo", estado: "Falhou · tentar de novo", falhou: true },
          ].map((linha) => (
            <div
              key={linha.estado}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.5rem",
                ...raio("var(--raio)"),
                backgroundColor: "var(--bg)",
              }}
            >
              <span
                style={{
                  flex: "none",
                  width: "3rem",
                  height: "3rem",
                  ...raio("calc(var(--raio) * 0.75)"),
                  overflow: "hidden",
                }}
              >
                <Moldura rotulo="" raio="calc(var(--raio) * 0.75)" atmosfera variante={2} />
              </span>
              <span>
                <span style={{ display: "block", fontSize: "0.875rem" }}>{linha.tipo}</span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: linha.falhou ? "var(--critico)" : "var(--ink-3)",
                  }}
                >
                  {linha.estado}
                </span>
              </span>
            </div>
          ))}
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <BotaoSecundario>Fechar</BotaoSecundario>
            <BotaoPrimario>Tentar de novo</BotaoPrimario>
          </div>
        </div>
      </div>
    </Chao>
  );
}

/** A-08 · Música do casal — player informativo, sem fila social. */
export function TelaMusica({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <Cabecalho titulo="Música da festa" />

      <div style={{ flex: 1, padding: `0 ${PADDING_LATERAL}`, display: "grid", gap: "1rem", alignContent: "start" }}>
        <div style={{ position: "relative", aspectRatio: "1", maxWidth: "12rem", margin: "0 auto", ...raio("var(--raio-superficie)"), overflow: "hidden" }}>
          <Moldura rotulo="" raio="var(--raio-superficie)" atmosfera variante={5} />
        </div>
        <p style={{ margin: 0, textAlign: "center", fontFamily: "var(--fonte-titulo)", fontSize: "1.125rem" }}>
          Perfect — Ed Sheeran
        </p>
        <p style={{ margin: 0, textAlign: "center", fontSize: "0.6875rem", letterSpacing: "var(--tracking-rotulo)", textTransform: "uppercase", color: "var(--ink-3)" }}>
          Escolha do casal
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "3px", height: "2rem", alignItems: "flex-end" }}>
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} style={{ width: "3px", height: `${40 + (i % 5) * 12}%`, backgroundColor: "var(--acento)", borderRadius: "var(--raio-pilula)" }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "1rem" }}>
          <span style={{ display: "grid", placeItems: "center", width: "3rem", height: "3rem", borderRadius: "50%", backgroundColor: "var(--acento)", color: "var(--sobre-acento)" }}>
            ▶
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--ink-3)" }}>—:——</span>
        </div>
      </div>

      <BarraDeAbas ativa="feed" />
    </Chao>
  );
}

/** A-05 · Comentar — sheet sobre a foto aberta. */
export function TelaComentar({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <div style={{ position: "relative", flex: 1 }}>
        <Moldura rotulo="" raio="0" atmosfera variante={9} />
        <div
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            padding: "1.25rem",
            background: "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent)",
          }}
        >
          <div
            style={{
              padding: "1.25rem",
              display: "grid",
              gap: "0.75rem",
              ...raio("var(--raio-superficie)"),
              backgroundColor: "var(--superficie)",
              border: "1px solid var(--linha)",
            }}
          >
            <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem" }}>Comentários</p>
            <p style={{ margin: 0, fontSize: "0.84375rem", lineHeight: 1.45 }}>
              <span style={{ color: "var(--ink)" }}>Bia</span> que foto linda · 23:41
            </p>
            <p style={{ margin: 0, fontSize: "0.84375rem", lineHeight: 1.45 }}>
              <span style={{ color: "var(--ink)" }}>Tio João</span> essa é a melhor da noite · 23:52
            </p>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <span style={{ flex: 1, minHeight: "44px", padding: "0 0.875rem", display: "grid", alignItems: "center", fontSize: "0.9rem", border: "1px solid var(--linha)", borderRadius: "var(--raio-pilula)", color: "var(--ink-3)" }}>
                Escreva um comentário…
              </span>
              <BotaoPrimario>Enviar</BotaoPrimario>
            </div>
          </div>
        </div>
      </div>
    </Chao>
  );
}

/** A-06 · Denúncia — sheet de sinalização sobre a foto aberta. */
export function TelaDenuncia({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <div style={{ position: "relative", flex: 1 }}>
        <Moldura rotulo="" raio="0" atmosfera variante={9} />
        <div
          style={{
            position: "absolute",
            insetInline: 0,
            bottom: 0,
            padding: "1.25rem",
            background: "linear-gradient(to top, color-mix(in srgb, var(--bg) 92%, transparent), transparent)",
          }}
        >
          <div
            style={{
              padding: "1.25rem",
              display: "grid",
              gap: "0.75rem",
              ...raio("var(--raio-superficie)"),
              backgroundColor: "var(--superficie)",
              border: "1px solid var(--linha)",
            }}
          >
            <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem" }}>
              Sinalizar esta foto
            </p>
            <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
              A moderação revisa depois. O upload não trava.
            </p>
            <span
              style={{
                minHeight: "44px",
                padding: "0 0.875rem",
                display: "grid",
                alignItems: "center",
                fontSize: "0.9rem",
                border: "1px solid var(--linha)",
                borderRadius: "var(--raio-pilula)",
                color: "var(--ink-3)",
              }}
            >
              Motivo (opcional)
            </span>
            <BotaoPrimario>Sinalizar</BotaoPrimario>
            <BotaoSecundario>Bloquear autor</BotaoSecundario>
          </div>
        </div>
      </div>
    </Chao>
  );
}

/**
 * O feed **antes** do gate.
 *
 * A mesma aba, sem reação e sem comentário — o ADR 0009 diz que a interação
 * abre na hora que o anfitrião escolher. Desabilitar botões contaria que
 * existe algo trancado; não desenhá-los conta a verdade, que é que ainda não
 * é hora.
 */
export function TelaAntesDoGate({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <Cabecalho titulo={texto(pack, "landing.exemplo.nome")} acao={<Pilula>847 fotos</Pilula>} />

      <div style={{ padding: `0 ${PADDING_LATERAL} 1rem` }}>
        <AvisoGate>
          As reações e os comentários abrem no horário que o anfitrião escolheu. Até lá,
          continue enviando: tudo já está indo para o álbum.
        </AvisoGate>
      </div>

      <div
        style={{
          flex: 1,
          padding: `0 ${PADDING_LATERAL}`,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridAutoRows: "min-content",
          gap: "0.375rem",
          overflow: "hidden",
        }}
      >
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} style={{ position: "relative", aspectRatio: "1" }}>
            <Moldura rotulo="" raio="var(--raio)" atmosfera variante={i * 3} />
          </span>
        ))}
      </div>

      <BarraDeAbas ativa="feed" />
    </Chao>
  );
}

/** O álbum do evento, em grade — a mecânica que o Instagram consolidou. */
export function TelaAlbum({ pack, momentos }: { pack: Pack; momentos: string[] }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <BarraDeStatus />
      <Cabecalho titulo="O álbum" acao={<Pilula>847</Pilula>} />

      <div
        style={{
          display: "flex",
          gap: "0.4375rem",
          padding: `0 ${PADDING_LATERAL} 0.875rem`,
          overflow: "hidden",
        }}
      >
        <Pilula ativa>Tudo</Pilula>
        {momentos.slice(0, 3).map((m) => (
          <Pilula key={m}>{m}</Pilula>
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gridAutoRows: "min-content",
          gap: "2px",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: 18 }, (_, i) => (
          <span key={i} style={{ position: "relative", aspectRatio: "1" }}>
            <Moldura rotulo="" raio="0rem" atmosfera variante={i} />
          </span>
        ))}
      </div>

      <BarraDeAbas ativa="album" />
    </Chao>
  );
}

/**
 * A capa do evento: foto grande, nome, e o carrossel dos capítulos.
 *
 * Três coisas mudam em relação à referência, e nenhuma é enfeite:
 *
 * 1. **A foto termina no chão do evento, não num borrão branco.** A dots
 *    desfoca o topo até o branco, e o branco é da dots. Aqui a foto desce
 *    para a cor que o casal escolheu, que é o que faz a tela ser a cara
 *    deles e não a nossa.
 * 2. **O card do meio é 9:16 e sangra pelos lados.** É a proporção do
 *    TikTok, que é a proporção em que a festa foi fotografada. O vizinho
 *    espiando é o que conta que existe mais e convida a arrastar.
 * 3. **O capítulo que está acontecendo pulsa.** A referência põe um lápis de
 *    editar no card; editar é tarefa de anfitrião. Para o convidado, o que
 *    importa é onde a festa está agora.
 */
export function TelaCapa({
  pack,
  momentos,
  fundo,
}: {
  pack: Pack;
  momentos: string[];
  fundo: "claro" | "escuro";
}) {
  const capitulos = momentos.slice(0, 5);

  return (
    <Chao fundo={fundo} pack={pack}>
      <div style={{ position: "relative", height: "20.5rem", flex: "none" }}>
        <Moldura rotulo="" raio="0rem" atmosfera variante={1} />

        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundImage:
              "linear-gradient(to bottom, color-mix(in srgb, var(--bg) 30%, transparent) 0%, transparent 26%, transparent 58%, var(--bg) 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: "2.75rem",
            left: "1.125rem",
            right: "1.125rem",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <BotaoFlutuante>
            <IconeVoltar />
          </BotaoFlutuante>
          <span style={{ display: "flex", gap: "0.5rem" }}>
            <BotaoFlutuante>
              <IconeCompartilhar tamanho={19} />
            </BotaoFlutuante>
            <BotaoFlutuante>
              <IconeMais />
            </BotaoFlutuante>
          </span>
        </div>
      </div>

      <div style={{ position: "relative", marginTop: "-3.25rem", textAlign: "center", padding: "0 1.5rem" }}>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontWeight: 300,
            fontSize: "1.875rem",
            lineHeight: 1.1,
            letterSpacing: "var(--tracking-titulo)",
          }}
        >
          {texto(pack, "landing.exemplo.nome")}
        </p>
        <p style={{ margin: "0.4375rem 0 0", fontSize: "0.8125rem", color: "var(--ink-2)" }}>
          8 de novembro · 112 pessoas fotografando
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0.5rem",
          padding: "1.25rem 1.125rem 1.125rem",
        }}
      >
        {[
          { r: "Álbum", v: "847", i: <IconeGrade tamanho={20} /> },
          { r: "Feed", v: "ao vivo", i: <IconePilha tamanho={20} /> },
          { r: "Missões", v: "1 de 4", i: <Estrela tamanho={20} /> },
          { r: "Convidados", v: "112", i: <IconePessoa tamanho={20} /> },
        ].map((a) => (
          <span
            key={a.r}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.3125rem",
              padding: "0.75rem 0.25rem",
              ...raio("var(--raio)"),
              backgroundColor: "var(--superficie)",
              color: "var(--ink-2)",
            }}
          >
            {a.i}
            <span style={{ fontSize: "0.625rem", letterSpacing: "var(--tracking-rotulo)", textTransform: "uppercase" }}>
              {a.r}
            </span>
            <span style={{ fontSize: "0.6875rem", color: "var(--ink)" }}>{a.v}</span>
          </span>
        ))}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "0 1.125rem 0.75rem" }}>
          <span style={{ fontFamily: "var(--fonte-titulo)", fontSize: "1rem" }}>Os momentos</span>
          <span style={{ fontSize: "0.6875rem", color: "var(--ink-3)" }}>arraste</span>
        </div>

        <div style={{ display: "flex", gap: "0.625rem", padding: "0 1.125rem", overflow: "hidden" }}>
          {capitulos.map((c, i) => {
            const central = i === 1;

            return (
              <span
                key={c}
                style={{
                  position: "relative",
                  flex: "none",
                  width: central ? "9.25rem" : "5rem",
                  aspectRatio: "9 / 16",
                  overflow: "hidden",
                  ...raio("var(--raio)"),
                  opacity: central ? 1 : 0.62,
                }}
              >
                <Moldura rotulo="" raio="var(--raio)" atmosfera variante={i * 6 + 2} />

                <span
                  style={{
                    position: "absolute",
                    top: 0,
                    right: 0,
                    bottom: 0,
                    left: 0,
                    backgroundImage:
                      "linear-gradient(to top, color-mix(in srgb, var(--bg) 88%, transparent), transparent 52%)",
                  }}
                />

                {central && i === 1 ? (
                  <span
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      left: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3125rem",
                      padding: "0.25rem 0.5rem",
                      ...raio("var(--raio-pilula)"),
                      backgroundColor: "var(--acento)",
                      color: "var(--sobre-acento)",
                      fontSize: "0.5rem",
                      letterSpacing: "var(--tracking-rotulo)",
                      textTransform: "uppercase",
                    }}
                  >
                    <span className="pulso" style={{ width: "0.25rem", height: "0.25rem", borderRadius: "50%", backgroundColor: "currentColor" }} />
                    agora
                  </span>
                ) : null}

                <span
                  style={{
                    position: "absolute",
                    left: "0.625rem",
                    right: "0.625rem",
                    bottom: "0.625rem",
                    display: "block",
                    fontFamily: "var(--fonte-titulo)",
                    fontSize: central ? "0.9375rem" : "0.6875rem",
                    lineHeight: 1.15,
                    letterSpacing: "var(--tracking-titulo)",
                  }}
                >
                  {c}
                </span>
              </span>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "1.125rem 1.5rem 2rem" }}>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            padding: "1.0625rem",
            ...raio("var(--raio-pilula)"),
            backgroundColor: "var(--acento)",
            color: "var(--sobre-acento)",
            fontWeight: 600,
          }}
        >
          Enviar foto
        </span>
      </div>
    </Chao>
  );
}

/* ── anfitrião ──────────────────────────────────────────────────────── */

const SECOES_DO_ANFITRIAO = [
  "Ao vivo",
  "A parede",
  "O álbum",
  "Missões",
  "Identidade",
  "Moderação",
  "O livro",
  "Convidados",
] as const;

type SecaoDoAnfitriao = (typeof SECOES_DO_ANFITRIAO)[number];

function Lateral({ pack, ativa }: { pack: Pack; ativa: SecaoDoAnfitriao }) {
  return (
    <aside
      style={{
        width: "13.75rem",
        flex: "none",
        padding: "1.5rem 1.125rem",
        borderRightWidth: "1px",
        borderRightStyle: "solid",
        borderRightColor: "var(--linha)",
      }}
    >
      <p style={{ margin: "0 0 1.5rem", fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem" }}>
        {texto(pack, "landing.exemplo.nome")}
      </p>
      {SECOES_DO_ANFITRIAO.map((item) => (
        <p
          key={item}
          style={{
            margin: "0 0 0.1875rem",
            padding: "0.5625rem 0.75rem",
            ...raio("var(--raio)"),
            backgroundColor: item === ativa ? "var(--superficie-alta)" : "transparent",
            color: item === ativa ? "var(--ink)" : "var(--ink-2)",
            fontSize: "0.875rem",
          }}
        >
          {item}
        </p>
      ))}
    </aside>
  );
}

function Interruptor({ ligado }: { ligado: boolean }) {
  return (
    <span
      style={{
        flex: "none",
        width: "3.25rem",
        height: "1.875rem",
        ...raio("var(--raio-pilula)"),
        backgroundColor: ligado ? "var(--acento)" : "var(--linha)",
        display: "flex",
        alignItems: "center",
        justifyContent: ligado ? "flex-end" : "flex-start",
        padding: "0.1875rem",
      }}
    >
      <span style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", backgroundColor: "var(--superficie-alta)" }} />
    </span>
  );
}

function Cartao({ children, destacado }: { children: ReactNode; destacado?: boolean }) {
  return (
    <div
      style={{
        margin: "1rem 0 0",
        padding: "1.125rem 1.25rem",
        ...raio("var(--raio)"),
        backgroundColor: destacado
          ? "color-mix(in srgb, var(--acento) 12%, var(--superficie))"
          : "var(--superficie)",
      }}
    >
      {children}
    </div>
  );
}

/**
 * O painel do anfitrião, na web e no chão claro.
 *
 * Lido de manhã no sofá, não às 23h no salão. O gate da interação fica na
 * primeira dobra porque é a decisão que o anfitrião mais volta para mexer.
 *
 * O interruptor de menores ([ADR 0012](../../../../docs/adr/0012-menores-sem-perguntar-idade.md))
 * é o único lugar do produto onde menor de idade aparece — e ele **não
 * pergunta idade**. É controle de evento, não de pessoa: ninguém é marcado e
 * nenhuma data de nascimento é guardada. Os três efeitos vêm de
 * `padroesDoEvento`, e não de texto redigitado aqui, senão a tela contaria uma
 * política e o servidor aplicaria outra.
 */
export function TelaPainel({ pack, haMenores = false }: { pack: Pack; haMenores?: boolean }) {
  const padroes = padroesDoEvento({ haMenores });

  const efeitos: [string, string][] = [
    [
      "Compartilhar para fora",
      padroes.compartilhamentoExterno ? "ligado" : "desligado por padrão",
    ],
    [
      "Para segurar uma foto",
      padroes.denunciasParaSegurar === 1
        ? "uma denúncia"
        : `${padroes.denunciasParaSegurar} denúncias`,
    ],
    [
      "Gate de interação",
      padroes.gateComecaFechado ? "começa fechado" : "abre junto com a festa",
    ],
  ];

  return (
    <Chao fundo="claro" pack={pack}>
      <div style={{ display: "flex", height: "100%" }}>
        <Lateral pack={pack} ativa="Ao vivo" />

        <main style={{ flex: 1, padding: "1.75rem 2rem", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontWeight: 300, fontSize: "1.875rem", letterSpacing: "var(--tracking-titulo)" }}>
              A festa está acontecendo
            </p>
            <Pilula ativa>
              <span className="pulso" style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", backgroundColor: "currentColor" }} />
              ao vivo
            </Pilula>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", margin: "1.5rem 0 0" }}>
            {[
              { n: "847", o: "fotos enviadas" },
              { n: "112", o: "convidados fotografando" },
              { n: "4", o: "missões abertas" },
              {
                n: "0",
                o:
                  padroes.denunciasParaSegurar === 1
                    ? "denúncias · uma já segura"
                    : `denúncias · ${padroes.denunciasParaSegurar} seguram`,
              },
            ].map((x) => (
              <div key={x.o} style={{ padding: "1.125rem", ...raio("var(--raio)"), backgroundColor: "var(--superficie-alta)" }}>
                <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontWeight: 300, fontSize: "1.875rem", lineHeight: 1, color: "var(--acento-texto)", fontVariantNumeric: "tabular-nums" }}>
                  {x.n}
                </p>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.78125rem", color: "var(--ink-2)" }}>{x.o}</p>
              </div>
            ))}
          </div>

          <Cartao destacado>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <span>
                <span style={{ display: "block", fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem" }}>
                  Reações e comentários
                </span>
                <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.8125rem", color: "var(--ink-2)" }}>
                  {padroes.gateComecaFechado
                    ? "Começam fechados. Quem abre, e quando, é você."
                    : "Abrem às 22h30. Quem escolhe a hora é você."}
                </span>
              </span>
              <Interruptor ligado={!padroes.gateComecaFechado} />
            </div>
          </Cartao>

          <Cartao>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
              <span>
                <span style={{ display: "block", fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem" }}>
                  Há menores nesta festa
                </span>
                <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.8125rem", color: "var(--ink-2)" }}>
                  Sobe o piso para todo mundo. Não perguntamos a idade de ninguém, aqui nem em
                  lugar nenhum — quem conhece os convidados é você.
                </span>
              </span>
              <Interruptor ligado={haMenores} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem", marginTop: "0.875rem" }}>
              {efeitos.map(([rotulo, valor]) => (
                <span
                  key={rotulo}
                  style={{
                    padding: "0.625rem 0.75rem",
                    ...raio("var(--raio)"),
                    backgroundColor: "var(--superficie-alta)",
                  }}
                >
                  <span style={{ display: "block", fontSize: "0.625rem", letterSpacing: "var(--tracking-rotulo)", textTransform: "uppercase", color: "var(--ink-3)" }}>
                    {rotulo}
                  </span>
                  <span style={{ display: "block", marginTop: "0.1875rem", fontSize: "0.8125rem", color: haMenores ? "var(--acento-texto)" : "var(--ink-2)" }}>
                    {valor}
                  </span>
                </span>
              ))}
            </div>
          </Cartao>

          <p style={{ margin: "1.5rem 0 0.75rem", fontSize: "0.6875rem", letterSpacing: "var(--tracking-rotulo)", textTransform: "uppercase", color: "var(--acento-texto)" }}>
            Chegando agora
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "0.5rem" }}>
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} style={{ position: "relative", aspectRatio: "3 / 4" }}>
                <Moldura rotulo="" raio="var(--raio)" atmosfera variante={i * 6} />
              </span>
            ))}
          </div>
        </main>
      </div>
    </Chao>
  );
}

/* ── a parede ───────────────────────────────────────────────────────── */

/**
 * Como cada modelo resolve o enquadramento.
 *
 * O número de fotos e o "aceita em pé" saem de `PERFIS`, nunca daqui: se um
 * modelo mudar de tamanho no núcleo, o catálogo muda junto ou não muda nada.
 * O que sobra nesta tabela é a única coisa que o núcleo não sabe — o desenho.
 */
const COMO_RESOLVE: Readonly<Record<ModeloDeTelao, string>> = {
  polaroide: "Uma cópia por vez, com o crédito assinado na margem de baixo.",
  mural: "Três verticais lado a lado preenchem o 16:9 sem cortar nenhuma.",
  colagem: "Arranjos que se alternam, para a parede não virar papel de parede.",
  ambiente: "A vertical inteira sobre a própria foto desfocada — a borda some sem recorte.",
  cheio: "Sangra até a borda. É o único que recusa foto em pé, e a fila filtra antes de sortear.",
  carrossel: "Uma de cada vez, com as vizinhas espiando: é o que conta que existe mais.",
  dump: "Nove de uma vez. A mesa inteira aparece na mesma passada.",
  tbt: "Puxa da faixa antiga, não da recente. Retrospectiva da foto de cinco minutos atrás não é retrospectiva de nada.",
};

const NOMES_DOS_MODELOS: Readonly<Record<ModeloDeTelao, string>> = {
  polaroide: "Polaroide",
  mural: "Mural",
  colagem: "Colagem",
  ambiente: "Ambiente",
  cheio: "Cheio",
  carrossel: "Carrossel",
  dump: "Dump",
  tbt: "TBT",
};

export function nomeDoModelo(modelo: ModeloDeTelao): string {
  return NOMES_DOS_MODELOS[modelo];
}

/** O perfil em prosa, direto de `PERFIS`. */
export function perfilEmPalavras(modelo: ModeloDeTelao): string {
  const perfil = PERFIS[modelo];
  const quantas = perfil.fotos === 1 ? "uma foto por vez" : `${perfil.fotos} fotos de uma vez`;
  const emPe = perfil.aceitaEmPe ? "aceita foto em pé" : "só foto deitada";
  return `${quantas} · ${emPe}`;
}

export function notaDoModelo(modelo: ModeloDeTelao): string {
  return `${perfilEmPalavras(modelo)}. ${COMO_RESOLVE[modelo]}`;
}

function Quadro({
  variante,
  proporcao,
  curvatura = "var(--raio)",
  style,
}: {
  variante: number;
  proporcao?: string;
  curvatura?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "block",
        position: "relative",
        overflow: "hidden",
        ...raio(curvatura),
        ...(proporcao ? { aspectRatio: proporcao } : {}),
        ...style,
      }}
    >
      <Moldura rotulo="" raio={curvatura} atmosfera variante={variante} />
    </span>
  );
}

const PREENCHE: CSSProperties = { width: "100%", height: "100%" };

/**
 * O enquadramento de um modelo, sem cromo.
 *
 * Toda proporção aqui é 9:16, 3:4 ou 16:9 declarada — nenhum `objectFit:
 * cover` num quadro deitado. A regra vermelha da spec 010 é que nada corte na
 * vertical, e `cover` é exatamente a linha que a quebraria sem avisar.
 *
 * `mini` some com o texto do enquadramento. Numa miniatura de 180px um crédito
 * de 11px fica proporcionalmente do tamanho de um cartaz, e o que a miniatura
 * precisa mostrar é a forma, não a legenda.
 */
function Enquadramento({ modelo, mini }: { modelo: ModeloDeTelao; mini?: boolean }) {
  if (modelo === "cheio") {
    return <Quadro variante={11} curvatura="0rem" style={PREENCHE} />;
  }

  if (modelo === "polaroide") {
    return (
      <span style={{ display: "grid", placeItems: "center", ...PREENCHE }}>
        <span
          style={{
            display: "flex",
            flexDirection: "column",
            height: "88%",
            aspectRatio: "0.72",
            padding: mini ? "6% 6% 0" : "1rem 1rem 0",
            ...raio("var(--raio)"),
            backgroundColor: "var(--superficie-alta)",
          }}
        >
          <Quadro variante={2} curvatura="0rem" style={{ flex: 1, width: "100%" }} />
          {mini ? (
            <span style={{ height: "14%", minHeight: "0.375rem" }} />
          ) : (
            <span
              style={{
                padding: "0.875rem 0.25rem",
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.125rem",
                letterSpacing: "var(--tracking-rotulo)",
                color: "var(--ink-2)",
              }}
            >
              Bia · 23h41
            </span>
          )}
        </span>
      </span>
    );
  }

  if (modelo === "mural") {
    return (
      <span
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${PERFIS.mural.fotos}, 1fr)`,
          gap: "var(--espaco)",
          placeItems: "center",
          ...PREENCHE,
        }}
      >
        {Array.from({ length: PERFIS.mural.fotos }, (_, i) => (
          <Quadro key={i} variante={i * 7 + 3} proporcao="9 / 16" style={{ height: "100%" }} />
        ))}
      </span>
    );
  }

  if (modelo === "colagem") {
    return (
      <span
        style={{
          display: "grid",
          gridTemplateColumns: "1.15fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: "var(--espaco)",
          ...PREENCHE,
        }}
      >
        <Quadro variante={4} style={{ gridRow: "1 / 3" }} />
        {Array.from({ length: PERFIS.colagem.fotos - 1 }, (_, i) => (
          <Quadro key={i} variante={i * 5 + 9} />
        ))}
      </span>
    );
  }

  if (modelo === "ambiente") {
    return (
      <span
        style={{
          position: "relative",
          overflow: "hidden",
          ...raio("var(--raio)"),
          ...PREENCHE,
          display: "grid",
          placeItems: "center",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            filter: mini ? "blur(0.375rem)" : "blur(2rem)",
            transform: "scale(1.2)",
          }}
        >
          <Moldura rotulo="" raio="0rem" atmosfera variante={6} />
        </span>
        <span
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "color-mix(in srgb, var(--bg) 55%, transparent)",
          }}
        />
        <Quadro variante={6} proporcao="9 / 16" style={{ position: "relative", height: "100%" }} />
      </span>
    );
  }

  if (modelo === "carrossel") {
    return (
      <span
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          overflow: "hidden",
          ...PREENCHE,
        }}
      >
        {[
          { v: 12, altura: "68%", opacidade: 0.38 },
          { v: 3, altura: "100%", opacidade: 1 },
          { v: 17, altura: "68%", opacidade: 0.38 },
        ].map((q, i) => (
          <Quadro
            key={i}
            variante={q.v}
            proporcao="9 / 16"
            style={{ height: q.altura, opacity: q.opacidade }}
          />
        ))}

        <span style={{ position: "absolute", bottom: "3%", display: "flex", gap: "0.3125rem" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                width: "0.3125rem",
                height: "0.3125rem",
                borderRadius: "50%",
                backgroundColor: i === 1 ? "var(--acento)" : "var(--linha)",
              }}
            />
          ))}
        </span>
      </span>
    );
  }

  if (modelo === "dump") {
    const naPrimeira = Math.ceil(PERFIS.dump.fotos / 2);
    const linhas = [naPrimeira, PERFIS.dump.fotos - naPrimeira];

    return (
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--espaco)",
          ...PREENCHE,
        }}
      >
        {linhas.map((quantas, linha) => (
          <span key={linha} style={{ display: "flex", gap: "var(--espaco)", height: "44%" }}>
            {Array.from({ length: quantas }, (_, i) => (
              <Quadro
                key={i}
                variante={linha * 13 + i * 3}
                proporcao="3 / 4"
                style={{ height: "100%" }}
              />
            ))}
          </span>
        ))}
      </span>
    );
  }

  return (
    <span style={{ display: "grid", placeItems: "center", ...PREENCHE }}>
      <span style={{ position: "relative", height: "100%", aspectRatio: "9 / 16" }}>
        <Moldura rotulo="" raio="var(--raio)" atmosfera variante={19} />
        <span
          style={{
            position: "absolute",
            top: "4%",
            left: "5%",
            ...(mini ? { width: "45%", height: "5%" } : { padding: "0.4375rem 1rem" }),
            ...raio("var(--raio-pilula)"),
            backgroundColor: "var(--acento)",
            color: "var(--sobre-acento)",
            fontSize: "0.875rem",
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
          }}
        >
          {mini ? "" : "19h20 · a chegada"}
        </span>
      </span>
    </span>
  );
}

/**
 * A parede do salão, num modelo por vez.
 *
 * Sem cromo e sem controle: quem troca de modelo é o rodízio, e o único texto
 * na tela é o do evento — a marca Albora não aparece na parede (verificação 8
 * da spec 010).
 */
export function TelaTelao({ pack, modelo }: { pack: Pack; modelo: ModeloDeTelao }) {
  const sangra = modelo === "cheio";

  return (
    <Chao fundo="escuro" pack={pack}>
      <div
        style={{
          position: "relative",
          flex: 1,
          overflow: "hidden",
          padding: sangra ? "0" : "var(--espaco)",
        }}
      >
        <Enquadramento modelo={modelo} />

        <span
          style={{
            position: "absolute",
            left: "1.5rem",
            bottom: "1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.625rem 1.375rem",
            ...raio("var(--raio-pilula)"),
            backgroundColor: "color-mix(in srgb, var(--bg) 72%, transparent)",
          }}
        >
          <span className="pulso" style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", backgroundColor: "var(--acento)" }} />
          <span style={{ fontFamily: "var(--fonte-titulo)", fontSize: "1.25rem", letterSpacing: "var(--tracking-rotulo)" }}>
            ao vivo · 847 fotos
          </span>
        </span>

        <span
          style={{
            position: "absolute",
            right: "1.5rem",
            top: "1.5rem",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "1.5rem",
            letterSpacing: "var(--tracking-rotulo)",
            color: "var(--ink-2)",
          }}
        >
          {texto(pack, "landing.exemplo.nome")}
        </span>
      </div>
    </Chao>
  );
}

function Marcador({ marcado }: { marcado: boolean }) {
  return (
    <span
      style={{
        flex: "none",
        display: "grid",
        placeItems: "center",
        width: "1.125rem",
        height: "1.125rem",
        ...raio("0.375rem"),
        backgroundColor: marcado ? "var(--acento)" : "transparent",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: marcado ? "var(--acento)" : "var(--linha)",
        color: "var(--sobre-acento)",
        fontSize: "0.6875rem",
      }}
    >
      {marcado ? "✓" : ""}
    </span>
  );
}

/**
 * As fotos que a escolha deixaria de fora, desenhadas.
 *
 * Três verticais riscadas e uma deitada inteira: a frase "três de cada quatro
 * fotos nunca apareceriam" é abstrata até alguém ver as três. É este desenho
 * que faz o anfitrião entender a recusa sem ler o parágrafo.
 */
function OQueFicariaDeFora() {
  return (
    <span style={{ display: "flex", alignItems: "flex-end", gap: "0.5rem" }}>
      {[0, 1, 2].map((i) => (
        <span key={i} style={{ position: "relative", height: "4.5rem", aspectRatio: "9 / 16" }}>
          <Moldura rotulo="" raio="var(--raio)" atmosfera variante={i * 8 + 1} />
          <span
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              display: "grid",
              placeItems: "center",
              ...raio("var(--raio)"),
              backgroundColor: "color-mix(in srgb, var(--critico) 62%, transparent)",
              color: "var(--sobre-acento)",
              fontSize: "1rem",
            }}
          >
            ✕
          </span>
        </span>
      ))}

      <span style={{ position: "relative", height: "4.5rem", aspectRatio: "16 / 9" }}>
        <Moldura rotulo="" raio="var(--raio)" atmosfera variante={21} />
      </span>

      <span style={{ fontSize: "0.75rem", lineHeight: 1.4, color: "var(--ink-2)", maxWidth: "30ch" }}>
        Três de cada quatro fotos de festa são verticais. Só a quarta subiria à parede.
      </span>
    </span>
  );
}

/**
 * A escolha dos modelos, no admin.
 *
 * A recusa é desenhada e não só descrita porque o defeito que ela evita é
 * invisível durante a festa: com só `cheio` marcado a parede roda a noite
 * inteira parecendo funcionar, mostrando o quarto deitado do acervo, e ninguém
 * descobre até o dia seguinte. Quem decide se a escolha vale é
 * `problemasDaEscolha` — a tela não repete a regra, ela mostra o veredito.
 */
export function TelaModelosDaParede({
  pack,
  escolhidos,
}: {
  pack: Pack;
  escolhidos: readonly ModeloDeTelao[];
}) {
  const problemas = problemasDaEscolha(escolhidos);
  const recusada = problemas.length > 0;

  return (
    <Chao fundo="claro" pack={pack}>
      <div style={{ display: "flex", height: "100%" }}>
        <Lateral pack={pack} ativa="A parede" />

        <main style={{ flex: 1, padding: "1.75rem 2rem", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <span>
              <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontWeight: 300, fontSize: "1.875rem", letterSpacing: "var(--tracking-titulo)" }}>
                Os modelos da parede
              </p>
              <p style={{ margin: "0.375rem 0 0", fontSize: "0.8125rem", color: "var(--ink-2)" }}>
                A parede alterna entre os modelos marcados a noite inteira. Marque quantos quiser.
              </p>
            </span>
            <Pilula ativa={!recusada}>
              {escolhidos.length} de {MODELOS_DE_TELAO.length}
            </Pilula>
          </div>

          {recusada ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.875rem",
                margin: "1.25rem 0 0",
                padding: "1.125rem 1.25rem",
                ...raio("var(--raio)"),
                backgroundColor: "color-mix(in srgb, var(--critico) 12%, var(--superficie))",
                borderLeftWidth: "3px",
                borderLeftStyle: "solid",
                borderLeftColor: "var(--critico)",
              }}
            >
              <span>
                <span style={{ display: "block", fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem", color: "var(--critico)" }}>
                  Esta escolha não pode ser salva
                </span>
                {problemas.map((problema) => (
                  <span key={problema} style={{ display: "block", marginTop: "0.25rem", fontSize: "0.8125rem", color: "var(--ink-2)" }}>
                    {problema}
                  </span>
                ))}
              </span>

              <OQueFicariaDeFora />
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.75rem", margin: "1.25rem 0 0" }}>
            {MODELOS_DE_TELAO.map((modelo) => {
              const marcado = escolhidos.includes(modelo);
              const culpado = recusada && !PERFIS[modelo].aceitaEmPe && marcado;

              return (
                <div
                  key={modelo}
                  style={{
                    padding: "0.625rem",
                    ...raio("var(--raio)"),
                    backgroundColor: marcado
                      ? "color-mix(in srgb, var(--acento) 12%, var(--superficie))"
                      : "var(--superficie)",
                    borderWidth: "1px",
                    borderStyle: "solid",
                    borderColor: culpado
                      ? "var(--critico)"
                      : marcado
                        ? "var(--acento)"
                        : "var(--linha)",
                  }}
                >
                  <span
                    style={{
                      position: "relative",
                      display: "block",
                      aspectRatio: "16 / 9",
                      overflow: "hidden",
                      ...raio("var(--raio)"),
                      backgroundColor: "var(--ink)",
                      opacity: marcado ? 1 : 0.45,
                    }}
                  >
                    <Enquadramento modelo={modelo} mini />
                  </span>

                  <span style={{ display: "flex", alignItems: "center", gap: "0.4375rem", marginTop: "0.5rem" }}>
                    <Marcador marcado={marcado} />
                    <span style={{ fontFamily: "var(--fonte-titulo)", fontSize: "0.9375rem" }}>
                      {nomeDoModelo(modelo)}
                    </span>
                  </span>

                  <span
                    style={{
                      display: "block",
                      marginTop: "0.25rem",
                      fontSize: "0.6875rem",
                      lineHeight: 1.35,
                      color: PERFIS[modelo].aceitaEmPe ? "var(--ink-2)" : "var(--critico)",
                    }}
                  >
                    {perfilEmPalavras(modelo)}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", margin: "1.25rem 0 0" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0.75rem 1.75rem",
                ...raio("var(--raio-pilula)"),
                backgroundColor: recusada ? "var(--superficie-alta)" : "var(--acento)",
                color: recusada ? "var(--ink-3)" : "var(--sobre-acento)",
                fontWeight: 600,
              }}
            >
              Salvar
            </span>
            <span style={{ fontSize: "0.78125rem", color: "var(--ink-2)" }}>
              {recusada
                ? "Marque ao menos um modelo que aceite foto em pé."
                : "Vale já na próxima foto que subir."}
            </span>
          </div>
        </main>
      </div>
    </Chao>
  );
}
