"use client";

import {
  MARCA_ALBORA,
  MODELOS_DE_IDENTIDADE,
  paraVariaveis,
  resolverTokens,
} from "@albora/tokens";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  CHAO_QUENTE,
  Moldura,
  RAIO_CASCA,
  Realce,
  Rotulo,
  SOMBRA,
  SOMBRA_ALTA,
  Titulo,
  raio,
  transicao,
} from "./pecas";
import { Papelaria } from "./vitrines";

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
      "Segundos depois ela está no feed, e todo mundo acompanha pelo próprio celular. Ninguém precisa mandar nada para ninguém no dia seguinte.",
  },
] as const;

function Tela({ passo, exemplo, missao }: { passo: number; exemplo: string; missao: string }) {
  const escuro = resolverTokens({ marca: MARCA_ALBORA, pack: { fundo: "escuro" } });

  return (
    <div
      style={{
        ...(paraVariaveis(escuro) as CSSProperties),
        position: "relative",
        width: "100%",
        height: "100%",
        ...raio("calc(var(--raio-superficie) - 0.5rem)"),
        overflow: "hidden",
        backgroundColor: "var(--bg)",
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
        <span style={{ fontFamily: "var(--fonte-titulo)" }}>{exemplo}</span>
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
              ...raio("var(--raio)"),
              backgroundColor: "var(--ink)",
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
              ...raio("var(--raio)"),
              backgroundColor: "color-mix(in srgb, var(--acento) 22%, transparent)",
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
              {missao}
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
              ...raio("var(--raio-pilula)"),
              backgroundColor: "var(--ink)",
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
                backgroundColor: "var(--acento)",
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
              ...raio("var(--raio-pilula)"),
              backgroundColor: "var(--superficie-alta)",
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

function Fone({
  passo,
  largura,
  exemplo,
  missao,
}: {
  passo: number;
  largura: string;
  exemplo: string;
  missao: string;
}) {
  return (
    <div
      style={{
        position: "relative",
        width: largura,
        aspectRatio: "9 / 19",
        ...raio("var(--raio-superficie)"),
        padding: "0.5rem",
        backgroundImage:
          "linear-gradient(155deg, var(--superficie-alta), color-mix(in srgb, var(--acento) 18%, var(--superficie)))",
        boxShadow: SOMBRA_ALTA,
        ...transicao("transform", "var(--tempo-lento)"),
      }}
    >
      <Tela passo={passo} exemplo={exemplo} missao={missao} />
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
export function DemoRolagem({ exemplo, missao }: { exemplo: string; missao: string }) {
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
          ...raio(RAIO_CASCA),
          backgroundImage: CHAO_QUENTE,
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
            ...raio("var(--raio-pilula)"),
            backgroundColor: "color-mix(in srgb, var(--acento) 20%, transparent)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(progresso * 100)}%`,
              ...raio("var(--raio-pilula)"),
              backgroundColor: "var(--acento)",
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
          <Fone passo={passo} largura="min(15rem, 42vw)" exemplo={exemplo} missao={missao} />

          <div style={{ flex: 1, minWidth: "min(17.5rem, 100%)", maxWidth: "40rem" }}>
            <div
              style={{
                position: "relative",
                padding: "0.5625rem",
                ...raio("calc(var(--raio-superficie) - 0.75rem)"),
                backgroundImage:
                  "linear-gradient(155deg, var(--superficie-alta), color-mix(in srgb, var(--acento) 18%, var(--superficie)))",
              }}
            >
              <div
                style={{
                  position: "relative",
                  height: "clamp(9rem, 20vw, 16rem)",
                  ...raio("var(--raio)"),
                  overflow: "hidden",
                  backgroundColor: "var(--ink)",
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
export function TelaoComIdentidade({ exemplo }: { exemplo: string }) {
  const [escolhido, setEscolhido] = useState(MODELOS_DE_IDENTIDADE[0]?.id ?? "");
  const modelo =
    MODELOS_DE_IDENTIDADE.find((m) => m.id === escolhido) ?? MODELOS_DE_IDENTIDADE[0];

  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    ...(modelo ? { evento: modelo.camada } : {}),
  });

  // Papel é papel. Uma identidade escura veste o telão às 23h, mas ninguém
  // imprime placa de mesa em chão preto — o chão claro é a única decisão que
  // a peça impressa não herda do modelo. Cor, fonte, raio, espaço e tracking
  // continuam sendo os mesmos, que é o que a seção está provando.
  const tokensNoPapel = resolverTokens({
    marca: MARCA_ALBORA,
    ...(modelo ? { evento: { ...modelo.camada, fundo: "claro" } } : { pack: { fundo: "claro" } }),
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
                borderWidth: "1px", borderStyle: "solid", borderColor: ativo ? "var(--acento)" : "var(--linha)",
                ...raio("var(--raio-pilula)"),
                background: ativo ? "var(--superficie-alta)" : "transparent",
                color: "var(--ink)",
                fontFamily: "var(--fonte-corpo)",
                fontSize: "0.90625rem",
                cursor: "pointer",
                ...transicao("all", "var(--tempo)"),
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
          ...(paraVariaveis(tokens) as CSSProperties),
          display: "flex",
          flexDirection: "column",
          gap: "clamp(1.125rem, 2.5vw, 2rem)",
        }}
      >
      <div
        style={{
          position: "relative",
          padding: "0.75rem",
          ...raio("var(--raio-superficie)"),
          backgroundImage:
            "linear-gradient(155deg, var(--superficie-alta), color-mix(in srgb, var(--acento) 18%, var(--superficie)))",
          boxShadow: SOMBRA_ALTA,
        }}
      >
        <div
          style={{
            position: "relative",
            height: "clamp(15.625rem, 38vw, 33.75rem)",
            ...raio("calc(var(--raio-superficie) - 0.75rem)"),
            overflow: "hidden",
            backgroundColor: "var(--bg)",
            ...transicao("background", "var(--tempo-lento)"),
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "var(--espaco)", right: "var(--espaco)", bottom: "var(--espaco)", left: "var(--espaco)",
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gridTemplateRows: "1fr 1fr",
              gap: "var(--espaco)",
              ...transicao("all", "var(--tempo-lento)"),
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
              ...raio("var(--raio-pilula)"),
              backgroundColor: "var(--superficie-alta)",
              color: "var(--ink)",
            }}
          >
            <span
              className="pulso"
              style={{
                width: "0.375rem",
                height: "0.375rem",
                borderRadius: "50%",
                backgroundColor: "var(--acento)",
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
            {exemplo}
          </div>
        </div>
      </div>

        <div style={paraVariaveis(tokensNoPapel) as CSSProperties}>
          <p
            style={{
              margin: "0 0 clamp(0.875rem, 2vw, 1.25rem)",
              fontSize: "0.8125rem",
              letterSpacing: "var(--tracking-rotulo)",
              textTransform: "uppercase",
              color: "var(--acento-texto)",
            }}
          >
            E o mesmo desenho sai impresso
          </p>
          <Papelaria exemplo={exemplo} />
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
export function Missoes({
  missoes,
  titulo,
  destaque,
  lede,
}: {
  missoes: { id: string; titulo: string }[];
  titulo: string;
  destaque: string;
  lede: string;
}) {
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
        ...raio(RAIO_CASCA),
        backgroundColor: "var(--bg)",
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
          {titulo} <Realce>{destaque}</Realce>
        </Titulo>
        <p style={{ margin: 0, maxWidth: "20rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
          {lede} Toque numa para ver como o convidado marca.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.375rem" }}>
        <div
          style={{
            flex: 1,
            height: "0.1875rem",
            ...raio("var(--raio-pilula)"),
            backgroundColor: "var(--linha)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${Math.round(razao * 100)}%`,
              ...raio("var(--raio-pilula)"),
              backgroundColor: "var(--acento)",
              ...transicao("width", "var(--tempo-lento)"),
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
                borderWidth: 0, borderStyle: "none",
                ...raio("var(--raio-superficie)"),
                background: feita ? "var(--superficie-alta)" : "var(--superficie)",
                color: "var(--ink)",
                fontFamily: "var(--fonte-corpo)",
                textAlign: "left",
                cursor: "pointer",
                boxShadow: SOMBRA,
                ...transicao("background", "var(--tempo)"),
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
                    borderWidth: "1px", borderStyle: "solid", borderColor: feita ? "var(--acento)" : "var(--linha)",
                    background: feita ? "var(--acento)" : "transparent",
                    color: "var(--sobre-acento)",
                    fontSize: "0.8125rem",
                    ...transicao("all", "var(--tempo)"),
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
                  ...transicao("opacity", "var(--tempo)"),
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


/**
 * Entra quando chega à vista, uma vez só.
 *
 * Três decisões que não são estilo:
 *
 * - **Começa visível e o JS esconde.** O contrário deixaria a página inteira
 *   em branco para quem tem JS desligado ou lento, e a verificação 2 da spec
 *   013 é justamente que a página funcione sem JS. Quem não hidrata vê tudo.
 * - **Desconecta ao revelar.** Observador vivo depois de cumprir o papel é
 *   trabalho por quadro que ninguém vê, numa página que já tem uma demo de
 *   300vh escutando rolagem.
 * - **Respeita `prefers-reduced-motion` no próprio JS.** A regra em CSS zera a
 *   transição, mas o elemento ainda partiria de `opacity: 0` até o observador
 *   disparar — e num Android velho isso é um piscar. Aqui ele nem começa
 *   escondido.
 */
export function Revelar({
  children,
  atraso = 0,
  className,
}: {
  children: ReactNode;
  atraso?: number;
  className?: string;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(true);

  useEffect(() => {
    const elemento = alvo.current;
    if (!elemento) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    setVisivel(false);

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return;
        setVisivel(true);
        observador.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px" },
    );

    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return (
    <div
      ref={alvo}
      {...(className ? { className } : {})}
      style={{
        opacity: visivel ? 1 : 0,
        transform: visivel ? "none" : "translateY(1.25rem)",
        transitionProperty: "opacity, transform",
        transitionDuration: "var(--tempo-lento)",
        transitionTimingFunction: "var(--curva)",
        transitionDelay: `${atraso}ms`,
      }}
    >
      {children}
    </div>
  );
}
