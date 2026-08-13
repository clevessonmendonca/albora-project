"use client";

import {
  MARCA_ALBORA,
  MODELOS_DE_IDENTIDADE,
  paraVariaveis,
  resolverTokens,
} from "@albora/tokens";
import { cn } from "@albora/ui-web";
import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Moldura,
  Realce,
  Rotulo,
  Titulo,
  pilulaClasses,
  pilulaClaraClasses,
  radiusStyle,
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
      className="relative flex h-full w-full flex-col overflow-hidden bg-bg text-ink"
      style={{
        ...(paraVariaveis(escuro) as CSSProperties),
        ...radiusStyle("calc(var(--raio-superficie) - 0.5rem)"),
      }}
    >
      <div className="flex justify-between px-4 pb-1.5 pt-3.5 text-[0.625rem] uppercase tracking-rotulo text-ink-3">
        <span>{PASSOS[passo]?.legenda}</span>
        <span className="font-titulo">{exemplo}</span>
      </div>

      {passo === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-[1.125rem] p-5">
          <div className="aspect-square w-[70%] rounded-token bg-ink p-2.5">
            <div
              className="h-full w-full"
              style={{
                backgroundImage:
                  "repeating-conic-gradient(var(--bg) 0 25%, var(--ink) 0 50%)",
                backgroundSize: "1.0625rem 1.0625rem",
              }}
            />
          </div>
          <p className="m-0 text-center font-titulo text-base leading-[1.4] text-ink-2">
            Aponte a câmera para o QR da mesa
          </p>
        </div>
      ) : null}

      {passo === 1 ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-3.5">
          <p className="m-0 text-[0.625rem] uppercase tracking-rotulo text-acento">
            MISSÃO 03 DE 04
          </p>
          <div className="rounded-token bg-acento-overlay p-4">
            <p className="m-0 font-titulo text-[1.125rem] leading-[1.25]">{missao}</p>
          </div>
          <div className="relative min-h-12 flex-1">
            <Moldura rotulo="A pista" raio="var(--raio)" />
          </div>
          <div className="flex items-center justify-center gap-2.5 rounded-pilula bg-ink px-3.5 py-[0.8125rem] text-[0.84375rem] font-semibold text-bg">
            <span className="pulso size-[0.5625rem] rounded-full bg-acento" />
            Enviando
          </div>
        </div>
      ) : null}

      {passo === 2 ? (
        <div className="relative grid flex-1 grid-cols-2 grid-rows-[1fr_1fr] gap-[0.4375rem] p-3.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="relative">
              <Moldura rotulo="" raio="var(--raio)" />
            </div>
          ))}
          <div className="absolute inset-x-3.5 bottom-3.5 rounded-pilula bg-superficie-alta p-[0.6875rem] text-center text-xs">
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
      className="relative aspect-[9/19] rounded-superficie bg-gradient-aparelho p-2 shadow-alta"
      style={{
        width: largura,
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
    <div ref={trilho} className="relative h-[300vh]">
      <div className="sticky top-[4.875rem] flex max-h-[calc(100vh-6rem)] flex-col gap-[clamp(0.625rem,1.6vw,1.25rem)] overflow-hidden rounded-superficie bg-gradient-chao-quente p-[clamp(1rem,2.4vw,1.875rem)_clamp(1rem,3vw,2.25rem)]">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Rotulo>Role para viver a festa</Rotulo>
            <Titulo tamanho="clamp(1.375rem, 3vw, 2.375rem)">{atual.titulo}</Titulo>
          </div>
          <span className="text-ink-2">{atual.legenda}</span>
        </div>

        <div className="h-[0.1875rem] overflow-hidden rounded-pilula bg-acento-overlay-suave">
          <div
            className="h-full rounded-pilula bg-acento"
            style={{ width: `${Math.round(progresso * 100)}%` }}
          />
        </div>

        <div className="flex min-h-0 flex-wrap items-center justify-center gap-[clamp(1rem,3vw,2.5rem)]">
          <Fone passo={passo} largura="min(15rem, 42vw)" exemplo={exemplo} missao={missao} />

          <div className="min-w-[min(17.5rem,100%)] max-w-[40rem] flex-1">
            <div className="rounded-[calc(var(--raio-superficie)-0.75rem)] bg-gradient-aparelho p-[0.5625rem]">
              <div className="relative grid h-[clamp(9rem,20vw,16rem)] grid-cols-3 grid-rows-[1fr_1fr] gap-2 overflow-hidden rounded-token bg-ink p-3">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="relative"
                    style={{
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
            <p className="mt-3.5 leading-[1.55] text-ink-2">{atual.descricao}</p>
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

  const tokensNoPapel = resolverTokens({
    marca: MARCA_ALBORA,
    ...(modelo ? { evento: { ...modelo.camada, fundo: "claro" } } : { pack: { fundo: "claro" } }),
  });

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-2.5">
        {MODELOS_DE_IDENTIDADE.map((m) => {
          const ativo = m.id === escolhido;

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setEscolhido(m.id)}
              aria-pressed={ativo}
              className={cn(
                "flex cursor-pointer items-center gap-[0.6875rem] rounded-pilula border px-5 py-3 font-corpo text-[0.90625rem] text-ink",
                ativo ? "border-acento bg-superficie-alta" : "border-linha bg-transparent",
              )}
              style={transicao("all", "var(--tempo)")}
            >
              <span
                className="size-3.5 rounded-full"
                style={{ background: m.amostra }}
              />
              {m.nome}
            </button>
          );
        })}
      </div>

      <div
        className="flex flex-col gap-[clamp(1.125rem,2.5vw,2rem)]"
        style={paraVariaveis(tokens) as CSSProperties}
      >
        <div className="relative rounded-superficie bg-gradient-aparelho p-3 shadow-alta">
          <div
            className="relative h-[clamp(15.625rem,38vw,33.75rem)] overflow-hidden bg-bg"
            style={{
              ...radiusStyle("calc(var(--raio-superficie) - 0.75rem)"),
              ...transicao("background", "var(--tempo-lento)"),
            }}
          >
            <div
              className="absolute inset-[var(--espaco)] grid grid-cols-[2fr_1fr] grid-rows-2 gap-[var(--espaco)]"
              style={transicao("all", "var(--tempo-lento)")}
            >
              <div className="relative row-span-2">
                <Moldura rotulo="Foto grande do telão" raio="var(--raio)" />
              </div>
              <div className="relative">
                <Moldura rotulo="" raio="var(--raio)" />
              </div>
              <div className="relative">
                <Moldura rotulo="" raio="var(--raio)" />
              </div>
            </div>

            <div className="absolute bottom-[var(--espaco)] left-[var(--espaco)] flex items-center gap-3 rounded-pilula bg-superficie-alta px-5 py-[0.6875rem] text-ink">
              <span className="pulso size-1.5 rounded-full bg-acento" />
              <span className="font-titulo text-sm uppercase tracking-rotulo">
                ao vivo · 847 fotos
              </span>
            </div>

            <div className="absolute right-[var(--espaco)] top-[var(--espaco)] font-titulo text-[0.8125rem] uppercase tracking-rotulo text-ink-2">
              {exemplo}
            </div>
          </div>
        </div>

        <div style={paraVariaveis(tokensNoPapel) as CSSProperties}>
          <p className="mb-[clamp(0.875rem,2vw,1.25rem)] text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
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
      className="rounded-superficie bg-bg p-[clamp(2rem,5vw,4.5rem)_clamp(1.5rem,4vw,3.75rem)] text-ink"
      style={paraVariaveis(escuro) as CSSProperties}
    >
      <div className="mb-[clamp(1.25rem,3vw,1.875rem)] flex flex-wrap items-end justify-between gap-6">
        <Titulo tamanho="clamp(1.75rem, 4.2vw, 3.25rem)" className="max-w-[20ch]">
          {titulo} <Realce>{destaque}</Realce>
        </Titulo>
        <p className="m-0 max-w-[20rem] leading-normal text-ink-2">
          {lede} Toque numa para ver como o convidado marca.
        </p>
      </div>

      <div className="mb-[1.375rem] flex items-center gap-4">
        <div className="h-[0.1875rem] flex-1 overflow-hidden rounded-pilula bg-linha">
          <div
            className="h-full rounded-pilula bg-acento"
            style={{
              width: `${Math.round(razao * 100)}%`,
              ...transicao("width", "var(--tempo-lento)"),
            }}
          />
        </div>
        <span className="whitespace-nowrap text-ink-2">
          {feitas.length} de {missoes.length}
        </span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(14.375rem,1fr))] gap-[0.875rem]">
        {missoes.map((missao, i) => {
          const feita = feitas.includes(missao.id);

          return (
            <button
              key={missao.id}
              type="button"
              onClick={() => alternar(missao.id)}
              aria-pressed={feita}
              className={cn(
                "flex min-h-[10.75rem] cursor-pointer flex-col justify-between gap-[1.375rem] rounded-superficie border-0 p-6 text-left font-corpo text-ink shadow-suave",
                feita ? "bg-superficie-alta" : "bg-superficie",
              )}
              style={transicao("background", "var(--tempo)")}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-[0.6875rem] font-semibold uppercase tracking-rotulo text-acento">
                  MISSÃO {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={cn(
                    "grid size-[1.625rem] place-items-center rounded-full border text-[0.8125rem]",
                    feita
                      ? "border-acento bg-acento text-sobre-acento"
                      : "border-linha bg-transparent",
                  )}
                  style={transicao("all", "var(--tempo)")}
                >
                  {feita ? "✓" : ""}
                </span>
              </span>
              <span
                className="font-titulo text-[1.3125rem] font-light leading-[1.22] tracking-titulo"
                style={{
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
      className={className}
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
