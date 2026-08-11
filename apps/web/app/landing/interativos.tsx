"use client";

import {
  MARCA_ALBORA,
  MODELOS_DE_IDENTIDADE,
  paraVariaveis,
  resolverTokens,
} from "@albora/tokens";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { CHAO_QUENTE, Moldura, RAIO_CASCA, Realce, Rotulo, Titulo } from "./pecas";

/**
 * As três peças da v4 que respondem a gesto.
 *
 * Todas renderizam no servidor no primeiro estado e só então hidratam — a
 * verificação 2 da spec 013 é "a página funciona sem JS até o CTA", e uma
 * demo que só existe depois da hidratação deixaria um buraco no meio da
 * página num Android velho em 4G.
 */

const PASSOS = [
  {
    titulo: "O QR na mesa",
    legenda: "23:41",
    descricao:
      "A placa fica na mesa. O convidado aponta a câmera e cai direto na tela de fotografar — sem loja de aplicativos e sem senha no caminho.",
  },
  {
    titulo: "A missão, e a foto",
    legenda: "23:47",
    descricao:
      "Um convite curto por vez. A foto sai do celular direto para o armazenamento, e a fila segura o envio até o sinal voltar.",
  },
  {
    titulo: "O álbum, ao vivo",
    legenda: "00:12",
    descricao:
      "Segundos depois ela está no telão e no álbum. Ninguém precisa mandar nada para ninguém no dia seguinte.",
  },
] as const;

function Tela({ passo }: { passo: number }) {
  const escuro = resolverTokens({ marca: MARCA_ALBORA, pack: { fundo: "escuro" } });

  return (
    <div
      style={{
        ...(paraVariaveis(escuro) as CSSProperties),
        position: "relative",
        width: "100%",
        height: "100%",
        borderRadius: "calc(var(--raio-superficie) - 0.5rem)",
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--ink)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "0.875rem 1rem 0.375rem",
          fontSize: "0.625rem",
          letterSpacing: "var(--tracking-rotulo)",
          color: "var(--ink-3)",
        }}
      >
        <span>{PASSOS[passo]?.legenda}</span>
        <span style={{ fontFamily: "var(--fonte-titulo)" }}>ANA &amp; JOÃO</span>
      </div>

      {passo === 0 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1.125rem",
            padding: "1.25rem",
          }}
        >
          <div
            style={{
              width: "70%",
              aspectRatio: "1",
              borderRadius: "var(--raio)",
              background: "var(--ink)",
              padding: "0.625rem",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundImage:
                  "repeating-conic-gradient(var(--bg) 0 25%, var(--ink) 0 50%)",
                backgroundSize: "1.0625rem 1.0625rem",
              }}
            />
          </div>
          <p
            style={{
              margin: 0,
              textAlign: "center",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "1rem",
              lineHeight: 1.4,
              color: "var(--ink-2)",
            }}
          >
            Aponte a câmera para o QR da mesa
          </p>
        </div>
      ) : null}

      {passo === 1 ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "0.5rem",
            padding: "0.875rem",
            minHeight: 0,
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.625rem",
              letterSpacing: "var(--tracking-rotulo)",
              color: "var(--acento)",
            }}
          >
            MISSÃO 03 DE 04
          </p>
          <div
            style={{
              padding: "1rem",
              borderRadius: "var(--raio)",
              background: "color-mix(in srgb, var(--acento) 22%, transparent)",
            }}
          >
            <p
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontSize: "1.125rem",
                lineHeight: 1.25,
              }}
            >
              Alguém dançando como se ninguém visse
            </p>
          </div>
          <div style={{ position: "relative", flex: 1, minHeight: "3rem" }}>
            <Moldura rotulo="A pista" raio="var(--raio)" />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.625rem",
              padding: "0.8125rem",
              borderRadius: "var(--raio-pilula)",
              background: "var(--ink)",
              color: "var(--bg)",
              fontSize: "0.84375rem",
              fontWeight: 600,
            }}
          >
            <span
              className="pulso"
              style={{
                width: "0.5625rem",
                height: "0.5625rem",
                borderRadius: "50%",
                background: "var(--acento)",
              }}
            />
            Enviando
          </div>
        </div>
      ) : null}

      {passo === 2 ? (
        <div
          style={{
            flex: 1,
            position: "relative",
            padding: "0.875rem",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gridAutoRows: "1fr",
            gap: "0.4375rem",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ position: "relative" }}>
              <Moldura rotulo="" raio="var(--raio)" />
            </div>
          ))}
          <div
            style={{
              position: "absolute",
              left: "0.875rem",
              right: "0.875rem",
              bottom: "0.875rem",
              padding: "0.6875rem",
              borderRadius: "var(--raio-pilula)",
              background: "var(--superficie-alta)",
              fontSize: "0.75rem",
              textAlign: "center",
            }}
          >
            847 fotos no álbum
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Fone({ passo, largura }: { passo: number; largura: string }) {
  return (
    <div
      style={{
        position: "relative",
        width: largura,
        aspectRatio: "9 / 19",
        borderRadius: "var(--raio-superficie)",
        padding: "0.5rem",
        background:
          "linear-gradient(155deg, var(--superficie-alta), color-mix(in srgb, var(--acento) 18%, var(--superficie)))",
        transition: "transform var(--tempo-lento) var(--curva)",
      }}
    >
      <Tela passo={passo} />
    </div>
  );
}

/**
 * A demo por rolagem da v4: um trilho de 300vh e um cartão grudado que avança
 * três passos conforme a página desce.
 *
 * Fora da tela o observador é desligado. Um `scroll` ouvindo a página inteira
 * durante seis seções é trabalho por quadro que ninguém vê.
 */
export function DemoRolagem() {
  const trilho = useRef<HTMLDivElement>(null);
  const [passo, setPasso] = useState(0);
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const alvo = trilho.current;
    if (!alvo) return;

    let pedido = 0;
    const medir = () => {
      pedido = 0;
      const caixa = alvo.getBoundingClientRect();
      const curso = caixa.height - window.innerHeight;
      if (curso <= 0) return;

      const p = Math.min(1, Math.max(0, -caixa.top / curso));
      setProgresso(p);
      setPasso(Math.min(PASSOS.length - 1, Math.floor(p * PASSOS.length)));
    };

    const aoRolar = () => {
      if (pedido === 0) pedido = requestAnimationFrame(medir);
    };

    // O `scroll` só é assinado enquanto o trilho está à vista.
    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (entrada?.isIntersecting) {
          window.addEventListener("scroll", aoRolar, { passive: true });
          medir();
        } else {
          window.removeEventListener("scroll", aoRolar);
        }
      },
      { rootMargin: "100px" },
    );

    observador.observe(alvo);

    return () => {
      observador.disconnect();
      window.removeEventListener("scroll", aoRolar);
      if (pedido !== 0) cancelAnimationFrame(pedido);
    };
  }, []);

  const atual = PASSOS[passo] ?? PASSOS[0];

  return (
    <div ref={trilho} style={{ position: "relative", height: "300vh" }}>
      <div
        style={{
          position: "sticky",
          top: "4.875rem",
          maxHeight: "calc(100vh - 6rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.625rem, 1.6vw, 1.25rem)",
          padding: "clamp(1rem, 2.4vw, 1.875rem) clamp(1rem, 3vw, 2.25rem)",
          borderRadius: RAIO_CASCA,
          background: CHAO_QUENTE,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "baseline",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <div>
            <Rotulo>Role para viver a festa</Rotulo>
            <Titulo tamanho="clamp(1.375rem, 3vw, 2.375rem)">{atual.titulo}</Titulo>
          </div>
          <span style={{ color: "var(--ink-2)" }}>{atual.legenda}</span>
        </div>

        <div
          style={{
            height: "0.1875rem",
            borderRadius: "var(--raio-pilula)",
            background: "color-mix(in srgb, var(--acento) 20%, transparent)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(progresso * 100)}%`,
              borderRadius: "var(--raio-pilula)",
              background: "var(--acento)",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "center",
            gap: "clamp(1rem, 3vw, 2.5rem)",
            minHeight: 0,
          }}
        >
          <Fone passo={passo} largura="min(15rem, 42vw)" />

          <div style={{ flex: 1, minWidth: "min(17.5rem, 100%)", maxWidth: "40rem" }}>
            <div
              style={{
                position: "relative",
                padding: "0.5625rem",
                borderRadius: "calc(var(--raio-superficie) - 0.75rem)",
                background:
                  "linear-gradient(155deg, var(--superficie-alta), color-mix(in srgb, var(--acento) 18%, var(--superficie)))",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "clamp(9rem, 20vw, 16rem)",
                  borderRadius: "var(--raio)",
                  overflow: "hidden",
                  background: "var(--ink)",
                  padding: "0.75rem",
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gridAutoRows: "1fr",
                  gap: "0.5rem",
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    style={{
                      position: "relative",
                      // As fotos entram uma a uma conforme a festa avança.
                      opacity: progresso * 6 > i ? 1 : 0,
                      transform: progresso * 6 > i ? "scale(1)" : "scale(0.92)",
                      transition:
                        "opacity var(--tempo-lento) var(--curva), transform var(--tempo-lento) var(--curva)",
                    }}
                  >
                    <Moldura rotulo="" raio="var(--raio)" />
                  </div>
                ))}
              </div>
            </div>
            <p style={{ margin: "0.875rem 0 0", color: "var(--ink-2)", lineHeight: 1.55 }}>
              {atual.descricao}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * O telão vestindo cada modelo de identidade.
 *
 * O quadro inteiro é redesenhado pelo resolvedor — cor, fonte, raio,
 * densidade e tracking de uma vez. Se um dia divergir do telão de verdade, é
 * porque alguém escreveu o segundo resolvedor que o ADR 0003 proíbe.
 */
export function TelaoComIdentidade() {
  const [escolhido, setEscolhido] = useState(MODELOS_DE_IDENTIDADE[0]?.id ?? "");
  const modelo =
    MODELOS_DE_IDENTIDADE.find((m) => m.id === escolhido) ?? MODELOS_DE_IDENTIDADE[0];

  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    ...(modelo ? { evento: modelo.camada } : {}),
  });

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.625rem", margin: "0 0 1.25rem" }}>
        {MODELOS_DE_IDENTIDADE.map((m) => {
          const ativo = m.id === escolhido;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setEscolhido(m.id)}
              aria-pressed={ativo}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6875rem",
                padding: "0.75rem 1.25rem",
                border: `1px solid ${ativo ? "var(--acento)" : "var(--linha)"}`,
                borderRadius: "var(--raio-pilula)",
                background: ativo ? "var(--superficie-alta)" : "transparent",
                color: "var(--ink)",
                fontFamily: "var(--fonte-corpo)",
                fontSize: "0.90625rem",
                cursor: "pointer",
                transition: "all var(--tempo) var(--curva)",
              }}
            >
              <span
                style={{
                  width: "0.875rem",
                  height: "0.875rem",
                  borderRadius: "50%",
                  background: m.amostra,
                }}
              />
              {m.nome}
            </button>
          );
        })}
      </div>

      <div
        style={{
          position: "relative",
          padding: "0.75rem",
          borderRadius: "var(--raio-superficie)",
          background:
            "linear-gradient(155deg, var(--superficie-alta), color-mix(in srgb, var(--acento) 18%, var(--superficie)))",
        }}
      >
        <div
          style={{
            ...(paraVariaveis(tokens) as CSSProperties),
            position: "relative",
            height: "clamp(15.625rem, 38vw, 33.75rem)",
            borderRadius: "calc(var(--raio-superficie) - 0.75rem)",
            overflow: "hidden",
            background: "var(--bg)",
            transition: "background var(--tempo-lento) var(--curva)",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "var(--espaco)",
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: "var(--espaco)",
              transition: "all var(--tempo-lento) var(--curva)",
            }}
          >
            <div style={{ position: "relative", gridRow: "span 2" }}>
              <Moldura rotulo="Foto grande do telão" raio="var(--raio)" />
            </div>
            <div style={{ position: "relative" }}>
              <Moldura rotulo="" raio="var(--raio)" />
            </div>
            <div style={{ position: "relative" }}>
              <Moldura rotulo="" raio="var(--raio)" />
            </div>
          </div>

          <div
            style={{
              position: "absolute",
              left: "var(--espaco)",
              bottom: "var(--espaco)",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              padding: "0.6875rem 1.25rem",
              borderRadius: "var(--raio-pilula)",
              background: "var(--superficie-alta)",
              color: "var(--ink)",
            }}
          >
            <span
              className="pulso"
              style={{
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                background: "var(--acento)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontSize: "0.875rem",
                letterSpacing: "var(--tracking-rotulo)",
              }}
            >
              ao vivo · 847 fotos
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              right: "var(--espaco)",
              top: "var(--espaco)",
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.8125rem",
              letterSpacing: "var(--tracking-rotulo)",
              color: "var(--ink-2)",
            }}
          >
            Ana &amp; João
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * A grade de missões da v4, no cartão escuro.
 *
 * O cartão recebe o chão escuro pelo mesmo resolvedor em vez de uma paleta
 * invertida à mão — é a mesma troca que o convidado vê às 23h, provada aqui.
 */
export function Missoes({ missoes }: { missoes: { id: string; titulo: string }[] }) {
  const [feitas, setFeitas] = useState<string[]>([]);
  const escuro = resolverTokens({ marca: MARCA_ALBORA, pack: { fundo: "escuro" } });

  const alternar = (id: string) =>
    setFeitas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );

  const razao = missoes.length === 0 ? 0 : feitas.length / missoes.length;

  return (
    <div
      style={{
        ...(paraVariaveis(escuro) as CSSProperties),
        padding: "clamp(2rem, 5vw, 4.5rem) clamp(1.5rem, 4vw, 3.75rem)",
        borderRadius: RAIO_CASCA,
        background: "var(--bg)",
        color: "var(--ink)",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "end",
          justifyContent: "space-between",
          gap: "1.5rem",
          marginBottom: "clamp(1.25rem, 3vw, 1.875rem)",
        }}
      >
        <Titulo tamanho="clamp(1.75rem, 4.2vw, 3.25rem)" style={{ maxWidth: "20ch" }}>
          Não se chama desafio. Chama-se <Realce>missão.</Realce>
        </Titulo>
        <p style={{ margin: 0, maxWidth: "20rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          Convites curtos, fáceis e criativos misturados. É o que mantém todo mundo enviando até o
          fim. Toque numa para ver como o convidado marca.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.375rem" }}>
        <div
          style={{
            flex: 1,
            height: "0.1875rem",
            borderRadius: "var(--raio-pilula)",
            background: "var(--linha)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(razao * 100)}%`,
              borderRadius: "var(--raio-pilula)",
              background: "var(--acento)",
              transition: "width var(--tempo-lento) var(--curva)",
            }}
          />
        </div>
        <span style={{ color: "var(--ink-2)", whiteSpace: "nowrap" }}>
          {feitas.length} de {missoes.length}
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(14.375rem, 1fr))",
          gap: "0.875rem",
        }}
      >
        {missoes.map((missao, i) => {
          const feita = feitas.includes(missao.id);

          return (
            <button
              key={missao.id}
              type="button"
              onClick={() => alternar(missao.id)}
              aria-pressed={feita}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "1.375rem",
                minHeight: "10.75rem",
                padding: "1.5rem",
                border: 0,
                borderRadius: "var(--raio-superficie)",
                background: feita ? "var(--superficie-alta)" : "var(--superficie)",
                color: "var(--ink)",
                fontFamily: "var(--fonte-corpo)",
                textAlign: "left",
                cursor: "pointer",
                transition: "background var(--tempo) var(--curva)",
              }}
            >
              <span
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    letterSpacing: "var(--tracking-rotulo)",
                    color: "var(--acento)",
                  }}
                >
                  MISSÃO {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    display: "grid",
                    placeItems: "center",
                    width: "1.625rem",
                    height: "1.625rem",
                    borderRadius: "50%",
                    border: `1px solid ${feita ? "var(--acento)" : "var(--linha)"}`,
                    background: feita ? "var(--acento)" : "transparent",
                    color: "var(--sobre-acento)",
                    fontSize: "0.8125rem",
                    transition: "all var(--tempo) var(--curva)",
                  }}
                >
                  {feita ? "✓" : ""}
                </span>
              </span>
              <span
                style={{
                  fontFamily: "var(--fonte-titulo)",
                  fontWeight: 300,
                  fontSize: "1.3125rem",
                  lineHeight: 1.22,
                  letterSpacing: "var(--tracking-titulo)",
                  opacity: feita ? 0.45 : 1,
                  transition: "opacity var(--tempo) var(--curva)",
                }}
              >
                {missao.titulo}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
