import "./landing.css";
import { MARCA_ALBORA, MODELOS_DE_IDENTIDADE, paraVariaveis, resolverTokens } from "@albora/tokens";
import { texto, type Pack } from "@albora/packs";
import type { CSSProperties } from "react";
import { DemoRolagem, Missoes, Revelar, TelaoComIdentidade } from "./interativos";
import { Marca } from "./marca";
import { MarcaAnimada } from "./marca-animada";
import {
  CHAO_QUENTE,
  Moldura,
  PILULA,
  PILULA_CLARA,
  RAIO_CASCA,
  Realce,
  Rotulo,
  Titulo,
  raio,
} from "./pecas";

/**
 * A landing (task 013), portada da v4 dos designers.
 *
 * Duas coisas mudam em relação ao arquivo original, e as duas são regra do
 * `CLAUDE.md`, não gosto:
 *
 * 1. **Nenhum hex.** A v4 escreve `#FFF6E9` e `#B4571F` direto; aqui cada um
 *    sai de token, e por isso a landing muda de cara junto com a identidade
 *    do evento em vez de ficar presa ao âmbar da Albora.
 * 2. **Nenhuma palavra de domínio.** Todo texto que diz "casamento" vem do
 *    pack, o que é o que faz `/15-anos` existir sem uma segunda página.
 *
 * A copy também diverge da v4 em três pontos, todos reportados: o original
 * promete "nenhum aplicativo" (contra o ADR 0008) e uma fila de aprovação de
 * moderação que o produto deliberadamente não tem.
 */

const LARGURA = "78rem";
const PADDING_LATERAL = "clamp(1.125rem, 4vw, 2.75rem)";

const PASSOS = [
  {
    titulo: "O QR já chega pronto",
    desc: "A placa da mesa e os cards saem com as cores e a fonte do seu evento. Você imprime e põe na mesa.",
  },
  {
    titulo: "A festa fotografa sozinha",
    desc: "Missões curtas aparecem no celular de quem escaneia: o brinde no instante do brinde, a mesa do jeito que ela está agora.",
  },
  {
    titulo: "O álbum já está lá",
    desc: "As fotos entram enquanto a festa acontece. No fim ele é seu, em resolução original, sem ninguém precisar mandar nada no dia seguinte.",
  },
] as const;

const NUMEROS = [
  { n: "4", o: "toques do QR até a primeira foto" },
  { n: "0", o: "downloads até a primeira foto" },
  { n: "48h", o: "de envio aberto depois da festa" },
  { n: "∞", o: "convidados e fotos, em todos os planos" },
] as const;

/**
 * As quatro superfícies do convidado, emprestadas da página do Lovable.
 *
 * O recuo desigual não é enfeite: são fotos em pé, escalonadas como quem
 * espalhou na mesa. E são **em pé** porque três de cada quatro fotos de festa
 * são — uma landing que as mostra deitadas promete um enquadramento que o
 * produto recusa.
 */
const MOMENTOS = [
  {
    rotulo: "Feed ao vivo",
    legenda: "A foto que alguém tirou há um minuto, do outro lado do salão.",
    recuo: "0rem",
    giro: "-1.4deg",
  },
  {
    rotulo: "Missões",
    legenda: "Um convite por vez, para quem nunca sabe o que fotografar.",
    recuo: "2.5rem",
    giro: "1deg",
  },
  {
    rotulo: "Galeria de cada um",
    legenda: "Cada convidado vai embora com as próprias fotos no celular.",
    recuo: "1rem",
    giro: "-0.7deg",
  },
  {
    rotulo: "O álbum inteiro",
    legenda: "Tudo junto, em resolução original, no dia seguinte de manhã.",
    recuo: "3.5rem",
    giro: "1.6deg",
  },
] as const;

/**
 * Os fatos, listados.
 *
 * Ogilvy: quanto mais você conta, mais você vende — a leitura despenca até 50
 * palavras e quase não cai entre 50 e 500, porque quem chegou aqui já está
 * interessado. Cada linha é verificável no produto; nenhuma é adjetivo.
 */
const FATOS = [
  "Convidados e fotos sem limite, em todos os planos",
  "QR na mesa: nenhum download e nenhum cadastro até a primeira foto",
  "Fila offline: a foto sobe sozinha quando o sinal voltar",
  "Localização e dados do aparelho apagados no celular, antes de subir",
  "Feed, stories e reações liberados na hora que você escolher",
  "Telão em quatro modelos, e foto em pé nunca é cortada",
  "Envio aberto por 48 horas depois da festa",
  "Exportação para a sua nuvem no dia 330, e apagamos tudo no 365",
] as const;

const PERGUNTAS = [
  {
    q: "Meus convidados vão baixar um aplicativo?",
    a: "Não para a primeira foto. Escaneiam o QR e já fotografam pelo navegador. O aplicativo é convidado depois do primeiro envio, para quem quiser feed, stories e a própria galeria.",
  },
  {
    q: "Quanto tempo leva para montar?",
    a: "Cerca de três minutos: nome do evento, data e a identidade visual. O QR e as placas saem prontos para impressão no fim.",
  },
  {
    q: "E se a internet do salão for ruim?",
    a: "As fotos entram numa fila dentro do celular e sobem sozinhas quando o sinal voltar. Vale mesmo se a pessoa fechar a tela ou for embora no meio do envio.",
  },
  {
    q: "Quem consegue ver as fotos do meu evento?",
    a: "Só quem escaneia o seu QR. A sessão do convidado vale para um evento e não passa para nenhum outro. Nada disso aparece em busca ou em página pública.",
  },
  {
    q: "E se alguém mandar uma foto inadequada?",
    a: "Por padrão tudo aparece, porque no dia da festa ninguém vai aprovar fila. O que protege é automático: filtro antes da parede, denúncia por qualquer convidado, e você tira em um toque.",
  },
  {
    q: "As fotos ficam com vocês?",
    a: "São suas. No plano pago, a exportação para a sua nuvem roda sozinha no dia 330, e no dia 365 apagamos o que estiver conosco.",
  },
] as const;

function Secao({
  children,
  id,
  padding,
  revelar,
}: {
  children: React.ReactNode;
  id?: string;
  padding?: string;
  revelar?: boolean;
}) {
  return (
    <section
      {...(id ? { id } : {})}
      style={{
        maxWidth: LARGURA,
        margin: "0 auto",
        padding: padding ?? `clamp(2.5rem, 6vw, 5.5rem) ${PADDING_LATERAL}`,
      }}
    >
      {/* A demo **não** revela: `transform` cria bloco de contenção e o
          `position: sticky` do cartão dela para de funcionar. */}
      {revelar ? <Revelar>{children}</Revelar> : children}
    </section>
  );
}

/**
 * Números reais de festas acontecendo agora, quando existirem.
 *
 * **Ausente é o estado correto hoje**, e a pílula cai no rótulo do pack. Um
 * contador chumbado seria prova social inventada — a mesma coisa que o risco
 * da spec 013 proíbe em depoimento, e num mercado de boca a boca isso não
 * volta atrás. Quem preenche é uma consulta de agregação com papel dedicado
 * (`CLAUDE.md`), que ainda não existe.
 */
export type AoVivo = { fotos: number; eventos: number };

export function PaginaLanding({ pack, aoVivo }: { pack: Pack; aoVivo?: AoVivo }) {
  // A landing é lida às 14h no sofá; o app do convidado, às 23h num salão
  // escuro. Mesmo resolvedor, chão diferente — declarado, não herdado.
  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: { ...pack.tokens, fundo: "claro" },
  });

  const t = (chave: string) => texto(pack, chave);

  const missoes = [...pack.missoes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((m) => ({ id: m.id, titulo: t(m.chaveTitulo) }));

  const exemplo = t("landing.exemplo.nome");
  const lugares = pack.lugares.map((l) => t(l.chaveTitulo));

  return (
    <div
      style={{
        ...(paraVariaveis(tokens) as CSSProperties),
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
        lineHeight: 1.6,
        minHeight: "100vh",
        overflowX: "clip",
      }}
    >
      {/* Não gruda. Um CTA que persegue a tela o tempo todo é ruído no
          desktop, onde o botão já aparece no herói, nos planos e no
          fechamento. No celular quem cumpre o papel é a barra de baixo, que a
          spec 013 pede em texto. */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
          padding: `0.875rem ${PADDING_LATERAL}`,
          backgroundColor: "var(--bg)",
          borderBottomWidth: "1px", borderBottomStyle: "solid", borderBottomColor: "var(--linha)",
        }}
      >
        <span className="entra">
          <MarcaAnimada />
        </span>

        <nav className="nav-topo" style={{ display: "flex", gap: "1.625rem", color: "var(--ink-2)" }}>
          <a href="#experiencia" className="elo" style={{ color: "inherit", textDecoration: "none" }}>
            A experiência
          </a>
          <a href="#momentos" className="elo" style={{ color: "inherit", textDecoration: "none" }}>
            As fotos
          </a>
          <a href="#telao" className="elo" style={{ color: "inherit", textDecoration: "none" }}>
            Telão
          </a>
          <a href="#livro" className="elo" style={{ color: "inherit", textDecoration: "none" }}>
            Livro
          </a>
          <a href="#planos" className="elo" style={{ color: "inherit", textDecoration: "none" }}>
            Planos
          </a>
        </nav>

        <a href="#planos" className="pilula" style={{ ...PILULA, padding: "0.6875rem 1.375rem", fontSize: "0.875rem" }}>
          {t("landing.cta")}
        </a>
      </header>

      <Secao padding={`clamp(1.875rem, 4vw, 3.25rem) ${PADDING_LATERAL} 0`}>
        <div
          style={{
            position: "relative",
            ...raio(RAIO_CASCA),
            overflow: "hidden",
            backgroundImage: CHAO_QUENTE,
          }}
        >
          <div
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(20rem, 1fr))",
              gap: "clamp(1.75rem, 4vw, 3.75rem)",
              alignItems: "center",
              padding: "clamp(2.25rem, 6vw, 5.25rem) clamp(1.5rem, 4.5vw, 4.5rem)",
            }}
          >
            <div>
              <span
                className="entra"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  padding: "0.4375rem 1rem 0.4375rem 0.75rem",
                  ...raio("var(--raio-pilula)"),
                  backgroundColor: "var(--superficie-alta)",
                  fontSize: "0.8125rem",
                  color: "var(--ink-2)",
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
                {aoVivo
                  ? `${aoVivo.fotos.toLocaleString("pt-BR")} fotos enviadas · ${aoVivo.eventos} ${aoVivo.eventos === 1 ? "festa rolando" : "festas rolando"}`
                  : t("landing.rotulo")}
              </span>

              <h1
                className="heroi-titulo entra-2"
                style={{
                  margin: "1.5rem 0 0",
                  fontFamily: "var(--fonte-titulo)",
                  fontWeight: 300,
                  fontSize: "clamp(2.5rem, 5.6vw, 4.625rem)",
                  lineHeight: 1.02,
                  letterSpacing: "var(--tracking-titulo)",
                  textWrap: "balance",
                }}
              >
                {t("landing.titulo")} <Realce>{t("landing.titulo.destaque")}</Realce>
              </h1>

              <p
                className="entra-3"
                style={{
                  margin: "1.625rem 0 0",
                  maxWidth: "30rem",
                  fontSize: "clamp(1rem, 1.4vw, 1.15625rem)",
                  lineHeight: 1.6,
                  color: "var(--ink-2)",
                }}
              >
                {t("landing.lede")}
              </p>

              <div
                style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginTop: "2.125rem" }}
              >
                <a href="#planos" className="pilula" style={PILULA}>
                  {t("landing.cta")}
                </a>
                <a href="#momentos" className="pilula" style={PILULA_CLARA}>
                  Ver as fotos
                </a>
              </div>

              <p style={{ margin: "1.375rem 0 0", color: "var(--ink-3)" }}>
                Montar é grátis · não pedimos cartão · você decide antes de imprimir o QR
              </p>
            </div>

            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: "min(18.75rem, 80vw)",
                  aspectRatio: "9 / 19",
                  ...raio("var(--raio-superficie)"),
                  padding: "0.5625rem",
                  backgroundImage:
                    "linear-gradient(155deg, var(--superficie-alta), color-mix(in srgb, var(--acento) 18%, var(--superficie)))",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    ...raio("calc(var(--raio-superficie) - 0.5625rem)"),
                    overflow: "hidden",
                  }}
                >
                  <Moldura rotulo="A festa, por quem estava nela" raio="calc(var(--raio-superficie) - 0.5625rem)" />
                </div>

                {/* O selo do Lovable. Diz a promessa exata do ADR 0008 — o que
                    dispensa loja de aplicativos é a **primeira** foto, não o
                    produto inteiro. O original dizia "sem app, sem login". */}
                <span
                  style={{
                    position: "absolute",
                    top: "-1.75rem",
                    right: "-1.25rem",
                    width: "8.75rem",
                    height: "8.75rem",
                    borderRadius: "50%",
                    backgroundColor: "var(--acento)",
                    color: "var(--sobre-acento)",
                    display: "grid",
                    placeItems: "center",
                    textAlign: "center",
                    padding: "1rem",
                    transform: "rotate(5deg)",
                    fontFamily: "var(--fonte-titulo)",
                    fontStyle: "italic",
                    fontSize: "0.9375rem",
                    lineHeight: 1.3,
                  }}
                >
                  Fácil e rápido
                </span>
              </div>
            </div>
          </div>
        </div>
      </Secao>

      <Secao id="demo" padding={`clamp(1.875rem, 4vw, 3.25rem) ${PADDING_LATERAL} 0`}>
        <DemoRolagem exemplo={exemplo} missao={missoes[0]?.titulo ?? t("missao.livre")} />
      </Secao>

      <Secao id="experiencia" revelar>
        <div
          style={{
            padding: "clamp(1.75rem, 4vw, 3.75rem)",
            ...raio(RAIO_CASCA),
            backgroundColor: "color-mix(in srgb, var(--acento) 10%, var(--superficie))",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(17.5rem, 1fr))",
              gap: "clamp(1.5rem, 4vw, 3.5rem)",
              alignItems: "center",
            }}
          >
            <div style={{ maxWidth: "26.25rem" }}>
              <Rotulo>A experiência do convidado</Rotulo>
              <Titulo tamanho="clamp(1.75rem, 3.6vw, 2.75rem)" style={{ margin: "0 0 1.375rem" }}>
                Três passos até a primeira foto.
              </Titulo>

              {PASSOS.map((p, i) => (
                <div
                  key={p.titulo}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "1.125rem",
                    padding: "1.25rem 0",
                    borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "var(--linha)",
                  }}
                >
                  <span
                    style={{
                      flex: "none",
                      display: "grid",
                      placeItems: "center",
                      width: "2rem",
                      height: "2rem",
                      borderRadius: "50%",
                      backgroundColor: "var(--superficie-alta)",
                      fontFamily: "var(--fonte-titulo)",
                      color: "var(--acento-texto)",
                    }}
                  >
                    {i + 1}
                  </span>
                  <span>
                    <span style={{ display: "block" }}>{p.titulo}</span>
                    <span
                      style={{
                        display: "block",
                        marginTop: "0.3125rem",
                        fontSize: "0.84375rem",
                        lineHeight: 1.5,
                        color: "var(--ink-2)",
                      }}
                    >
                      {p.desc}
                    </span>
                  </span>
                </div>
              ))}

              <a
                href="#demo"
                className="elo" style={{ display: "inline-block", margin: "1.25rem 0 0", color: "var(--acento-texto)" }}
              >
                Ver a experiência acontecendo
              </a>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(9.375rem, 1fr))",
                gap: "0.875rem",
              }}
            >
              {NUMEROS.map((x) => (
                <div
                  key={x.o}
                  className="cartao"
                  style={{
                    padding: "1.625rem 1.5rem",
                    ...raio("var(--raio-superficie)"),
                    backgroundColor: "var(--superficie-alta)",
                  }}
                >
                  <p
                    style={{
                      margin: 0,
                      fontFamily: "var(--fonte-titulo)",
                      fontWeight: 300,
                      fontSize: "clamp(1.875rem, 3.4vw, 2.625rem)",
                      lineHeight: 1,
                      letterSpacing: "var(--tracking-titulo)",
                      color: "var(--acento-texto)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {x.n}
                  </p>
                  <p style={{ margin: "0.75rem 0 0", lineHeight: 1.5, color: "var(--ink-2)" }}>
                    {x.o}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Secao>

      <Secao id="momentos" revelar>
        <Rotulo>Durante e depois da festa</Rotulo>
        <Titulo tamanho="clamp(1.875rem, 4.4vw, 3.5rem)">
          {t("landing.momentos.titulo")} <Realce>{t("landing.momentos.destaque")}</Realce>
        </Titulo>
        <p
          style={{
            margin: "1.5rem 0 0",
            maxWidth: "46ch",
            fontSize: "clamp(1rem, 1.4vw, 1.15625rem)",
            lineHeight: 1.6,
            color: "var(--ink-2)",
          }}
        >
          {t("landing.momentos.lede")}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(10.5rem, 1fr))",
            gap: "clamp(1rem, 2.5vw, 1.75rem)",
            margin: "clamp(2.5rem, 6vw, 4.5rem) 0 0",
          }}
        >
          {MOMENTOS.map((m) => (
            <figure
              key={m.rotulo}
              className="cartao"
              style={{ margin: 0, marginTop: m.recuo, transform: `rotate(${m.giro})` }}
            >
              <div style={{ position: "relative", aspectRatio: "9 / 16" }}>
                <Moldura rotulo="" raio="var(--raio-superficie)" />
              </div>
              <figcaption style={{ margin: "1rem 0 0", textAlign: "center" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "0.6875rem",
                    letterSpacing: "var(--tracking-rotulo)",
                    textTransform: "uppercase",
                    color: "var(--acento-texto)",
                  }}
                >
                  {m.rotulo}
                </span>
                <span
                  style={{
                    display: "block",
                    margin: "0.4375rem auto 0",
                    maxWidth: "22ch",
                    fontSize: "0.8125rem",
                    lineHeight: 1.45,
                    color: "var(--ink-2)",
                  }}
                >
                  {m.legenda}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Secao>

      <Secao revelar>
        <Missoes
          missoes={missoes}
          titulo={t("landing.missoes.titulo")}
          destaque={t("landing.missoes.destaque")}
          lede={t("landing.missoes.lede")}
        />
      </Secao>

      <Secao id="telao" revelar>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "end",
            justifyContent: "space-between",
            gap: "1.5rem",
            marginBottom: "clamp(1.5rem, 3vw, 2.375rem)",
          }}
        >
          <div style={{ maxWidth: "41.25rem" }}>
            <Rotulo>Se a festa tiver telão ou TV</Rotulo>
            <Titulo tamanho="clamp(1.875rem, 4.4vw, 3.5rem)">{t("landing.telao.titulo")}</Titulo>
          </div>
          <p style={{ margin: 0, maxWidth: "20rem", color: "var(--ink-2)", lineHeight: 1.6 }}>
            {t("landing.telao.lede")}
          </p>
        </div>

        <TelaoComIdentidade exemplo={exemplo} />

        <p style={{ margin: "1.125rem 0 0", color: "var(--ink-3)" }}>
          Não precisa ter. Sem telão, a festa inteira acompanha pelo próprio celular, que é onde
          a maior parte das fotos é vista de qualquer jeito.
        </p>
      </Secao>

      <Secao id="livro" revelar>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(18.75rem, 1fr))",
            gap: "clamp(1.75rem, 4vw, 4.5rem)",
            alignItems: "center",
          }}
        >
          <div style={{ position: "relative", height: "clamp(17.5rem, 32vw, 27.5rem)" }}>
            <Moldura rotulo="O livro aberto sobre a mesa" raio="var(--raio-superficie)" />
          </div>
          <div>
            <Rotulo>Depois da festa</Rotulo>
            <Titulo tamanho="clamp(1.75rem, 4vw, 3.125rem)">O outro álbum da sua festa.</Titulo>
            <p
              style={{
                margin: "1.5rem 0 0",
                maxWidth: "28.75rem",
                fontSize: "1.0625rem",
                lineHeight: 1.6,
                color: "var(--ink-2)",
              }}
            >
              Bastidores, ângulos que ninguém cobriu, a pista às 2h. Você arrasta as fotos nos
              espaços e o arquivo sai pronto para a gráfica, no mesmo desenho da placa e do telão,
              sem precisar de designer.
            </p>

            <p style={{ margin: "1.375rem 0 0.75rem", color: "var(--ink-2)" }}>
              E já chega separado por onde cada foto foi tirada:
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {lugares.map((lugar) => (
                <span
                  key={lugar}
                  style={{
                    padding: "0.4375rem 0.9375rem",
                    ...raio("var(--raio-pilula)"),
                    backgroundColor: "var(--superficie-alta)",
                    fontSize: "0.84375rem",
                    color: "var(--ink-2)",
                  }}
                >
                  {lugar}
                </span>
              ))}
            </div>

            <p style={{ margin: "1.375rem 0 0", color: "var(--ink-3)" }}>
              Montar é grátis. O arquivo é seu.
            </p>
          </div>
        </div>
      </Secao>

      <Secao revelar>
        <div
          style={{
            padding: "clamp(1.75rem, 4vw, 3.75rem)",
            ...raio(RAIO_CASCA),
            backgroundColor: "color-mix(in srgb, var(--acento) 10%, var(--superficie))",
          }}
        >
          <Rotulo>O que está incluído</Rotulo>
          <Titulo tamanho="clamp(1.75rem, 3.6vw, 2.75rem)" style={{ maxWidth: "24ch" }}>
            Antes de falar de preço, o que você leva.
          </Titulo>

          <ul
            style={{
              margin: "clamp(1.5rem, 3vw, 2.375rem) 0 0",
              padding: 0,
              listStyle: "none",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(19rem, 1fr))",
              gap: "0.25rem clamp(1.5rem, 4vw, 3.5rem)",
            }}
          >
            {FATOS.map((fato) => (
              <li
                key={fato}
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.875rem",
                  padding: "0.9375rem 0",
                  borderBottomWidth: "1px",
                  borderBottomStyle: "solid",
                  borderBottomColor: "var(--linha)",
                  lineHeight: 1.5,
                  color: "var(--ink-2)",
                }}
              >
                <span style={{ flex: "none", color: "var(--acento-texto)" }} aria-hidden="true">
                  ✓
                </span>
                {fato}
              </li>
            ))}
          </ul>
        </div>
      </Secao>

      <Secao id="planos" revelar>
        <Titulo
          tamanho="clamp(1.75rem, 4.2vw, 3.25rem)"
          style={{ margin: "0 0 clamp(1.625rem, 3.5vw, 2.875rem)", maxWidth: "41.25rem" }}
        >
          {t("landing.planos.titulo")}
        </Titulo>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(16.5rem, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            {
              nome: "Grátis",
              preco: "R$ 0",
              periodo: "para sempre",
              itens: [
                "Convidados e fotos sem limite",
                "Missões e galeria",
                "Resolução reduzida",
                "Álbum por 30 dias",
              ],
              cta: "Criar álbum grátis",
              destaque: false,
            },
            {
              nome: `${t("landing.plano.completo")} · o mais escolhido`,
              preco: "R$ 199",
              periodo: "pagamento único",
              itens: [
                "Resolução original e vídeo",
                `Telão ao vivo nos ${MODELOS_DE_IDENTIDADE.length} modelos`,
                "Download em ZIP",
                "Identidade do evento aplicada",
                "12 meses, com exportação para a sua nuvem",
              ],
              cta: t("landing.cta"),
              destaque: true,
            },
            {
              nome: "Fornecedor",
              preco: "Sob consulta",
              periodo: "white-label",
              itens: [
                "Eventos sem limite, com a sua marca",
                "Um painel para a sua carteira",
                "Zero operação no dia da festa",
              ],
              cta: "Falar com a gente",
              destaque: false,
            },
          ].map((plano) => (
            <div
              key={plano.nome}
              className="cartao"
              style={{
                padding: "2rem",
                ...raio("var(--raio-superficie)"),
                backgroundImage: plano.destaque ? CHAO_QUENTE : "var(--superficie-alta)",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <p
                  style={{
                    margin: "0 0 0.75rem",
                    fontSize: "0.84375rem",
                    fontWeight: 600,
                    color: plano.destaque ? "var(--acento-texto)" : "var(--ink-2)",
                  }}
                >
                  {plano.nome}
                </p>
                <p
                  style={{
                    margin: 0,
                    fontFamily: "var(--fonte-titulo)",
                    fontWeight: 300,
                    fontSize: "2.5rem",
                    letterSpacing: "var(--tracking-titulo)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {plano.preco}
                  <span
                    style={{
                      display: "block",
                      marginTop: "0.375rem",
                      fontFamily: "var(--fonte-corpo)",
                      fontSize: "0.84375rem",
                      color: "var(--ink-2)",
                    }}
                  >
                    {plano.periodo}
                  </span>
                </p>
              </div>

              <ul
                style={{
                  margin: 0,
                  padding: 0,
                  listStyle: "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.625rem",
                  color: "var(--ink-2)",
                  flex: 1,
                }}
              >
                {plano.itens.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>

              <a
                href="#"
                className="pilula"
                style={{
                  ...(plano.destaque ? PILULA : PILULA_CLARA),
                  ...(plano.destaque
                    ? {}
                    : { backgroundColor: "color-mix(in srgb, var(--acento) 10%, var(--superficie))" }),
                  padding: "0.875rem",
                  fontSize: "0.90625rem",
                }}
              >
                {plano.cta}
              </a>
            </div>
          ))}
        </div>

        <p style={{ margin: "1.25rem 0 0", color: "var(--ink-3)" }}>
          Nada é cobrado depois da festa. A decisão acontece antes de imprimir o QR.
        </p>
      </Secao>

      <Secao padding={`0 ${PADDING_LATERAL} clamp(3.5rem, 8vw, 6.875rem)`}>
        <div style={{ maxWidth: "58.75rem" }}>
          {PERGUNTAS.map((p, i) => (
            <div
              key={p.q}
              className="pergunta"
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr)",
                gap: "clamp(1.125rem, 4vw, 3.25rem)",
                padding: "1.625rem 0",
                borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: "var(--linha)",
                ...(i === PERGUNTAS.length - 1
                  ? { borderBottomWidth: "1px", borderBottomStyle: "solid", borderBottomColor: "var(--linha)" }
                  : {}),
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--fonte-titulo)",
                  fontWeight: 400,
                  fontSize: "clamp(1.125rem, 2vw, 1.4375rem)",
                  lineHeight: 1.25,
                }}
              >
                {p.q}
              </h3>
              <p style={{ margin: 0, lineHeight: 1.65, color: "var(--ink-2)" }}>{p.a}</p>
            </div>
          ))}
        </div>
      </Secao>

      <Secao padding={`0 ${PADDING_LATERAL} clamp(2.5rem, 6vw, 5rem)`}>
        <div
          style={{
            position: "relative",
            padding: "clamp(2.75rem, 7vw, 6.875rem) clamp(1.5rem, 4vw, 3.75rem)",
            ...raio(RAIO_CASCA),
            backgroundImage: CHAO_QUENTE,
            textAlign: "center",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "relative", maxWidth: "53.75rem", margin: "0 auto" }}>
            <Titulo
              tamanho="clamp(1.75rem, 4.6vw, 3.625rem)"
              style={{ lineHeight: 1.04, margin: 0 }}
            >
              {t("landing.fechamento")} <Realce>{t("landing.fechamento.destaque")}</Realce>
            </Titulo>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                justifyContent: "center",
                marginTop: "2.25rem",
              }}
            >
              <a href="#planos" className="pilula" style={PILULA}>
                {t("landing.cta")}
              </a>
              <a href="#planos" className="pilula" style={PILULA_CLARA}>
                Sou cerimonialista
              </a>
            </div>
          </div>
        </div>
      </Secao>

      <footer
        style={{
          maxWidth: LARGURA,
          margin: "0 auto",
          padding: `0 ${PADDING_LATERAL} 2.75rem`,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.125rem",
          color: "var(--ink-2)",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
          <Marca id="marca-rodape" tamanho={22} />
          <span style={{ fontFamily: "var(--fonte-titulo)" }}>
            Albora · o álbum coletivo da sua festa
          </span>
        </span>
        <span style={{ color: "var(--ink-3)" }}>Feito no Brasil</span>
      </footer>

      <div
        className="cta-fixo"
        style={{
          position: "fixed",
          left: "0.75rem",
          right: "0.75rem",
          bottom: "0.75rem",
          zIndex: 70,
          alignItems: "center",
          gap: "0.75rem",
          padding: "0.625rem 0.625rem 0.625rem 1.25rem",
          ...raio("var(--raio-pilula)"),
          backgroundColor: "var(--ink)",
        }}
      >
        <span style={{ flex: 1, fontSize: "0.84375rem", lineHeight: 1.3, color: "var(--bg)" }}>
          Montar é grátis. Leva 3 minutos.
        </span>
        <a
          href="#planos"
          className="pilula"
          style={{ ...PILULA, backgroundColor: "var(--bg)", color: "var(--ink)", padding: "0.75rem 1.375rem" }}
        >
          Criar álbum
        </a>
      </div>
    </div>
  );
}
