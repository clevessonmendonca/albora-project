import { texto, type Pack } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";
import { Moldura, raio } from "../landing/pecas";
import {
  BarraDeAbas,
  BarraDeStatus,
  Estrela,
  IconeComentario,
  Pilula,
} from "./pecas-de-tela";

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
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "1.75rem",
          padding: "0 1.75rem 3rem",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.6875rem",
              letterSpacing: "var(--tracking-rotulo)",
              textTransform: "uppercase",
              color: "var(--acento)",
            }}
          >
            {texto(pack, "landing.exemplo.nome")}
          </p>
          <p
            style={{
              margin: "0.875rem 0 0",
              fontFamily: "var(--fonte-titulo)",
              fontWeight: 300,
              fontSize: "2rem",
              lineHeight: 1.1,
              letterSpacing: "var(--tracking-titulo)",
            }}
          >
            {texto(pack, "convidado.saudacao")}
          </p>
          <p style={{ margin: "0.875rem 0 0", fontSize: "0.9375rem", color: "var(--ink-2)" }}>
            Como você quer aparecer nas fotos que enviar?
          </p>
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

        <label style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
          <span
            style={{
              flex: "none",
              display: "grid",
              placeItems: "center",
              width: "1.375rem",
              height: "1.375rem",
              ...raio("0.4375rem"),
              backgroundColor: "var(--acento)",
              color: "var(--sobre-acento)",
              fontSize: "0.8125rem",
            }}
          >
            ✓
          </span>
          <span style={{ fontSize: "0.8125rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
            Concordo que as fotos que eu enviar apareçam para quem está nesta festa.{" "}
            <span style={{ color: "var(--acento)" }}>Ler o texto completo</span>
          </span>
        </label>

        <span
          style={{
            display: "grid",
            placeItems: "center",
            padding: "1.125rem",
            ...raio("var(--raio-pilula)"),
            backgroundColor: "var(--acento)",
            color: "var(--sobre-acento)",
            fontWeight: 600,
          }}
        >
          Fotografar
        </span>

        <p style={{ margin: 0, textAlign: "center", fontSize: "0.75rem", color: "var(--ink-3)" }}>
          Sem cadastro, sem senha e sem baixar nada
        </p>
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
          <div
            style={{
              padding: "0.875rem 1rem",
              ...raio("var(--raio)"),
              backgroundColor: "color-mix(in srgb, var(--acento) 92%, transparent)",
              color: "var(--sobre-acento)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "0.5625rem",
                letterSpacing: "var(--tracking-rotulo)",
                textTransform: "uppercase",
                opacity: 0.75,
              }}
            >
              Missão 03 de 04
            </p>
            <p
              style={{
                margin: "0.3125rem 0 0",
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.0625rem",
                lineHeight: 1.2,
              }}
            >
              {missao}
            </p>
          </div>
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

      <div style={{ flex: 1, overflow: "hidden", borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "var(--linha)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.625rem", padding: "0.875rem 1.125rem" }}>
          <span style={{ display: "grid", placeItems: "center", width: "1.875rem", height: "1.875rem", borderRadius: "50%", backgroundColor: "var(--superficie-alta)", fontSize: "0.75rem" }}>
            TJ
          </span>
          <span style={{ flex: 1, fontSize: "0.84375rem" }}>Tio João</span>
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
        </div>

        <p style={{ margin: "0 1.125rem", fontSize: "0.84375rem", lineHeight: 1.45, color: "var(--ink-2)" }}>
          <span style={{ color: "var(--ink)" }}>Bia</span> essa é a melhor da noite
        </p>
      </div>

      <BarraDeAbas ativa="feed" />
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

      <div style={{ padding: "0 1.125rem 1rem" }}>
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-start",
            padding: "0.875rem 1rem",
            ...raio("var(--raio)"),
            backgroundColor: "var(--superficie)",
          }}
        >
          <span className="pulso" style={{ marginTop: "0.375rem", width: "0.4375rem", height: "0.4375rem", borderRadius: "50%", backgroundColor: "var(--acento)", flex: "none" }} />
          <span style={{ fontSize: "0.8125rem", lineHeight: 1.45, color: "var(--ink-2)" }}>
            As reações e os comentários abrem no horário que o anfitrião escolheu. Até lá,
            continue enviando: tudo já está indo para o álbum.
          </span>
        </div>
      </div>

      <div style={{ flex: 1, padding: "0 1.125rem", display: "grid", gridTemplateColumns: "1fr 1fr", gridAutoRows: "min-content", gap: "0.375rem", overflow: "hidden" }}>
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

      <div style={{ display: "flex", gap: "0.4375rem", padding: "0 1.125rem 0.875rem", overflow: "hidden" }}>
        <Pilula ativa>Tudo</Pilula>
        {momentos.slice(0, 3).map((m) => (
          <Pilula key={m}>{m}</Pilula>
        ))}
      </div>

      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridAutoRows: "min-content", gap: "2px", overflow: "hidden" }}>
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

/* ── anfitrião ──────────────────────────────────────────────────────── */

/**
 * O painel do anfitrião, na web e no chão claro.
 *
 * Lido de manhã no sofá, não às 23h no salão. O gate da interação fica na
 * primeira dobra porque é a decisão que o casal mais volta para mexer.
 */
export function TelaPainel({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="claro" pack={pack}>
      <div style={{ display: "flex", height: "100%" }}>
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
          {["Ao vivo", "O álbum", "Missões", "Identidade", "Moderação", "O livro", "Convidados"].map(
            (item, i) => (
              <p
                key={item}
                style={{
                  margin: "0 0 0.1875rem",
                  padding: "0.5625rem 0.75rem",
                  ...raio("var(--raio)"),
                  backgroundColor: i === 0 ? "var(--superficie-alta)" : "transparent",
                  color: i === 0 ? "var(--ink)" : "var(--ink-2)",
                  fontSize: "0.875rem",
                }}
              >
                {item}
              </p>
            ),
          )}
        </aside>

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
              { n: "0", o: "denúncias" },
            ].map((x) => (
              <div key={x.o} style={{ padding: "1.125rem", ...raio("var(--raio)"), backgroundColor: "var(--superficie-alta)" }}>
                <p style={{ margin: 0, fontFamily: "var(--fonte-titulo)", fontWeight: 300, fontSize: "1.875rem", lineHeight: 1, color: "var(--acento-texto)", fontVariantNumeric: "tabular-nums" }}>
                  {x.n}
                </p>
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.78125rem", color: "var(--ink-2)" }}>{x.o}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              margin: "1rem 0 0",
              padding: "1.125rem 1.25rem",
              ...raio("var(--raio)"),
              backgroundColor: "color-mix(in srgb, var(--acento) 12%, var(--superficie))",
            }}
          >
            <span>
              <span style={{ display: "block", fontFamily: "var(--fonte-titulo)", fontSize: "1.0625rem" }}>
                Reações e comentários
              </span>
              <span style={{ display: "block", marginTop: "0.25rem", fontSize: "0.8125rem", color: "var(--ink-2)" }}>
                Abrem às 22h30. Quem escolhe a hora é você.
              </span>
            </span>
            <span
              style={{
                flex: "none",
                width: "3.25rem",
                height: "1.875rem",
                ...raio("var(--raio-pilula)"),
                backgroundColor: "var(--acento)",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                padding: "0.1875rem",
              }}
            >
              <span style={{ width: "1.5rem", height: "1.5rem", borderRadius: "50%", backgroundColor: "var(--superficie-alta)" }} />
            </span>
          </div>

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

/** A parede do salão. Foto em pé aparece em pé, e nada corta na vertical. */
export function TelaTelao({ pack }: { pack: Pack }) {
  return (
    <Chao fundo="escuro" pack={pack}>
      <div style={{ position: "relative", flex: 1, display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "var(--espaco)", padding: "var(--espaco)" }}>
        <span style={{ position: "relative" }}>
          <Moldura rotulo="" raio="var(--raio)" atmosfera variante={2} />
        </span>
        <span style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "var(--espaco)" }}>
          <span style={{ position: "relative" }}>
            <Moldura rotulo="" raio="var(--raio)" atmosfera variante={9} />
          </span>
          <span style={{ position: "relative" }}>
            <Moldura rotulo="" raio="var(--raio)" atmosfera variante={14} />
          </span>
        </span>

        <span
          style={{
            position: "absolute",
            left: "var(--espaco)",
            bottom: "var(--espaco)",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.625rem 1.125rem",
            ...raio("var(--raio-pilula)"),
            backgroundColor: "var(--superficie-alta)",
          }}
        >
          <span className="pulso" style={{ width: "0.375rem", height: "0.375rem", borderRadius: "50%", backgroundColor: "var(--acento)" }} />
          <span style={{ fontFamily: "var(--fonte-titulo)", fontSize: "0.875rem", letterSpacing: "var(--tracking-rotulo)" }}>
            ao vivo · 847 fotos
          </span>
        </span>

        <span
          style={{
            position: "absolute",
            right: "var(--espaco)",
            top: "var(--espaco)",
            fontFamily: "var(--fonte-titulo)",
            fontSize: "0.9375rem",
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
