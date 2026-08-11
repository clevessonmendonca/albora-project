import type { CSSProperties } from "react";
import { rotuloDeHora } from "../../lib/agrupar-por-hora";
import { Moldura, SOMBRA, SOMBRA_ALTA, raio } from "./pecas";

/**
 * As vitrines: papelaria, álbum aberto e a linha do tempo da noite.
 *
 * Nenhuma delas usa foto, e isso é decisão, não falta. Todas as três são
 * desenhadas com os mesmos tokens do evento — trocar a identidade redesenha
 * as três de uma vez, que é a prova do ADR 0003 que a página vende. Uma
 * captura de tela de peça pronta não provaria nada disso: ficaria congelada
 * numa identidade só.
 */

/**
 * Um QR de mentira que lê como QR.
 *
 * O campo de ruído sozinho lê como tabuleiro de xadrez; são os três olhos de
 * canto que o olho reconhece antes de qualquer coisa. Não codifica nada, e
 * não deve: a placa de verdade é gerada no servidor com o slug do evento.
 */
function Olho({ canto, miolo }: { canto: CSSProperties; miolo: string }) {
  return (
    <span
      style={{
        position: "absolute",
        ...canto,
        width: "30%",
        height: "30%",
        backgroundColor: "var(--ink)",
        display: "grid",
        placeItems: "center",
      }}
    >
      <span
        style={{
          width: "60%",
          height: "60%",
          backgroundColor: "var(--bg)",
          display: "grid",
          placeItems: "center",
        }}
      >
        <span style={{ width: miolo, height: miolo, backgroundColor: "var(--ink)" }} />
      </span>
    </span>
  );
}

/**
 * `celula` é a aresta de um módulo em porcentagem do quadro.
 *
 * Um QR de 40px com módulo de 13% vira cinza: os olhos somem e a peça lê como
 * caixa vazia. Peça pequena recebe módulo grande, que é o que uma gráfica
 * faria de qualquer jeito.
 */
function Qr({ tamanho, celula = "13.5%" }: { tamanho: string; celula?: string }) {
  return (
    <span
      style={{
        display: "block",
        width: tamanho,
        height: tamanho,
        padding: "7%",
        ...raio("calc(var(--raio) / 2)"),
        backgroundColor: "var(--bg)",
        borderWidth: "1px",
        borderStyle: "solid",
        borderColor: "color-mix(in srgb, var(--ink) 12%, transparent)",
      }}
    >
      <span
        style={{
          position: "relative",
          display: "block",
          width: "100%",
          height: "100%",
          backgroundColor: "var(--bg)",
          backgroundImage: "repeating-conic-gradient(var(--ink) 0 25%, var(--bg) 0 50%)",
          backgroundSize: `${celula} ${celula}`,
        }}
      >
        <Olho canto={{ top: 0, left: 0 }} miolo="55%" />
        <Olho canto={{ top: 0, right: 0 }} miolo="55%" />
        <Olho canto={{ bottom: 0, left: 0 }} miolo="55%" />
      </span>
    </span>
  );
}

function Papel({
  children,
  proporcao,
  style,
}: {
  children: React.ReactNode;
  proporcao: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        aspectRatio: proporcao,
        display: "flex",
        flexDirection: "column",
        padding: "var(--espaco)",
        ...raio("var(--raio)"),
        backgroundColor: "var(--bg)",
        color: "var(--ink)",
        fontFamily: "var(--fonte-corpo)",
        boxShadow: SOMBRA,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * O que vai impresso na mesa: a placa, o cartão, a carta e o selo.
 *
 * Fica **dentro** do escopo de variáveis de quem chama, de propósito. É a
 * cascata que troca a identidade das quatro peças, sem uma prop atravessando
 * quatro componentes para dizer a mesma coisa que o CSS já sabe.
 */
export function Papelaria({ exemplo }: { exemplo: string }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))",
        gap: "clamp(0.875rem, 2vw, 1.5rem)",
        alignItems: "start",
      }}
    >
      <figure style={{ margin: 0 }}>
        <Papel proporcao="5 / 7" style={{ alignItems: "center", textAlign: "center", gap: "0.75rem" }}>
          <span
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.6875rem",
              letterSpacing: "var(--tracking-rotulo)",
              textTransform: "uppercase",
              color: "var(--acento-texto)",
            }}
          >
            {exemplo}
          </span>
          <span
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              width: "100%",
              minHeight: 0,
            }}
          >
            <Qr tamanho="min(7rem, 62%)" />
          </span>
          <span
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "clamp(0.9375rem, 1.5vw, 1.1875rem)",
              lineHeight: 1.15,
              letterSpacing: "var(--tracking-titulo)",
            }}
          >
            Aponte a câmera
          </span>
          <span style={{ fontSize: "0.6875rem", lineHeight: 1.4, color: "var(--ink-2)" }}>
            As fotos desta noite ficam todas no mesmo lugar
          </span>
        </Papel>
        <Legenda>A placa da mesa</Legenda>
      </figure>

      <figure style={{ margin: 0 }}>
        <Papel proporcao="5 / 7" style={{ gap: "0.6875rem" }}>
          <span
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "0.625rem",
              letterSpacing: "var(--tracking-rotulo)",
              textTransform: "uppercase",
              color: "var(--acento-texto)",
            }}
          >
            Para quem estava lá
          </span>
          <span
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "clamp(0.9375rem, 1.6vw, 1.25rem)",
              lineHeight: 1.18,
              letterSpacing: "var(--tracking-titulo)",
            }}
          >
            Você vai ver coisas hoje que mais ninguém vai ver.
          </span>
          <span style={{ flex: 1, fontSize: "0.6875rem", lineHeight: 1.5, color: "var(--ink-2)" }}>
            Fotografe do seu jeito. Tudo cai no mesmo álbum, e no fim da noite ele é de todo mundo
            que estava aqui.
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              paddingTop: "0.625rem",
              borderTopWidth: "1px",
              borderTopStyle: "solid",
              borderTopColor: "var(--linha)",
            }}
          >
            <Qr tamanho="2.5rem" celula="25%" />
            <span style={{ fontSize: "0.625rem", lineHeight: 1.3, color: "var(--ink-3)" }}>
              {exemplo}
            </span>
          </span>
        </Papel>
        <Legenda>A carta do convite</Legenda>
      </figure>

      <figure style={{ margin: 0 }}>
        <Papel
          proporcao="5 / 7"
          style={{
            justifyContent: "space-between",
            backgroundColor: "var(--acento)",
            color: "var(--sobre-acento)",
          }}
        >
          <span
            style={{
              fontFamily: "var(--fonte-titulo)",
              fontSize: "clamp(1.0625rem, 1.9vw, 1.5rem)",
              lineHeight: 1.1,
              letterSpacing: "var(--tracking-titulo)",
            }}
          >
            A noite inteira,
            <br />
            vista por dentro.
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.6875rem",
            }}
          >
            <Qr tamanho="2.75rem" celula="25%" />
            <span
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontStyle: "italic",
                fontSize: "0.75rem",
                lineHeight: 1.25,
              }}
            >
              aponte
              <br />a câmera
            </span>
          </span>
        </Papel>
        <Legenda>O selo do envelope</Legenda>
      </figure>

      <figure style={{ margin: 0 }}>
        <Papel proporcao="5 / 7" style={{ padding: 0, gap: 0 }}>
          <span style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <Moldura rotulo="" raio="var(--raio)" />
          </span>
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.1875rem",
              padding: "0.75rem var(--espaco) var(--espaco)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--fonte-titulo)",
                fontSize: "clamp(0.875rem, 1.4vw, 1.0625rem)",
                letterSpacing: "var(--tracking-titulo)",
              }}
            >
              {exemplo}
            </span>
            <span style={{ fontSize: "0.625rem", color: "var(--ink-3)" }}>
              O livro impresso, mesma capa
            </span>
          </span>
        </Papel>
        <Legenda>A capa do livro</Legenda>
      </figure>
    </div>
  );
}

function Legenda({ children }: { children: React.ReactNode }) {
  return (
    <figcaption
      style={{
        margin: "0.75rem 0 0",
        textAlign: "center",
        fontSize: "0.6875rem",
        letterSpacing: "var(--tracking-rotulo)",
        textTransform: "uppercase",
        color: "var(--ink-2)",
      }}
    >
      {children}
    </figcaption>
  );
}

/**
 * O livro aberto, diagramado por slots.
 *
 * Slots e não posicionamento livre porque é isso que o produto é: o
 * `CLAUDE.md` recusa editor de canvas, e uma landing que mostrasse foto
 * arrastada em qualquer lugar prometeria a ferramenta errada.
 */
export function AlbumAberto() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.125rem",
        ...raio("var(--raio-superficie)"),
        backgroundColor: "color-mix(in srgb, var(--ink) 22%, var(--superficie))",
        padding: "0.125rem",
        boxShadow: SOMBRA_ALTA,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          aspectRatio: "3 / 4",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gridTemplateRows: "1.35fr 1fr auto",
          gap: "0.5rem",
          padding: "clamp(0.75rem, 1.8vw, 1.375rem)",
          backgroundColor: "var(--bg)",
        }}
      >
        <div style={{ position: "relative", gridColumn: "span 2" }}>
          <Moldura rotulo="" raio="calc(var(--raio) / 1.5)" />
        </div>
        <div style={{ position: "relative" }}>
          <Moldura rotulo="" raio="calc(var(--raio) / 1.5)" />
        </div>
        <div style={{ position: "relative" }}>
          <Moldura rotulo="" raio="calc(var(--raio) / 1.5)" />
        </div>
        <p
          style={{
            gridColumn: "span 2",
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontSize: "0.6875rem",
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          {rotuloDeHora(23)} · a mesa
        </p>
      </div>

      <div
        style={{
          aspectRatio: "3 / 4",
          display: "grid",
          gridTemplateRows: "1fr auto",
          gap: "0.5rem",
          padding: "clamp(0.75rem, 1.8vw, 1.375rem)",
          backgroundColor: "var(--bg)",
        }}
      >
        <div style={{ position: "relative" }}>
          <Moldura rotulo="" raio="calc(var(--raio) / 1.5)" />
        </div>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--fonte-titulo)",
            fontWeight: 300,
            fontSize: "clamp(0.8125rem, 1.5vw, 1.0625rem)",
            lineHeight: 1.3,
            letterSpacing: "var(--tracking-titulo)",
            color: "var(--ink-2)",
          }}
        >
          Ninguém pediu esta foto. Ela apareceu.
        </p>
      </div>
    </div>
  );
}

/**
 * A noite se ordenando sozinha.
 *
 * As faixas saem de `rotuloDeHora`, a mesma função que ordena o álbum de
 * verdade. Se um dia o formato da hora mudar lá, muda aqui junto.
 */
const NOITE = [
  { hora: 19, titulo: "A chegada", fotos: 34, tiras: 3 },
  { hora: 21, titulo: "A mesa", fotos: 118, tiras: 6 },
  { hora: 23, titulo: "A pista", fotos: 306, tiras: 11 },
  { hora: 2, titulo: "O fim", fotos: 89, tiras: 5 },
] as const;

export function LinhaDoTempo() {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {NOITE.map((faixa, i) => (
        <div
          key={faixa.hora}
          style={{
            display: "grid",
            gridTemplateColumns: "4.5rem minmax(0, 1fr)",
            gap: "clamp(0.875rem, 2.5vw, 2rem)",
            alignItems: "center",
            padding: "clamp(0.875rem, 2vw, 1.375rem) 0",
            ...(i > 0
              ? {
                  borderTopWidth: "1px",
                  borderTopStyle: "solid",
                  borderTopColor: "var(--linha)",
                }
              : {}),
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontFamily: "var(--fonte-titulo)",
                fontWeight: 300,
                fontSize: "clamp(1.125rem, 2.2vw, 1.625rem)",
                lineHeight: 1,
                letterSpacing: "var(--tracking-titulo)",
                color: "var(--acento-texto)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {rotuloDeHora(faixa.hora)}
            </p>
            <p style={{ margin: "0.3125rem 0 0", fontSize: "0.75rem", color: "var(--ink-3)" }}>
              {faixa.titulo}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", minWidth: 0 }}>
            <div className="faixa-fotos" style={{ display: "flex", gap: "0.3125rem", minWidth: 0 }}>
              {Array.from({ length: faixa.tiras }, (_, n) => (
                <div
                  key={n}
                  style={{
                    position: "relative",
                    flex: "none",
                    height: "clamp(2.75rem, 5.5vw, 4.25rem)",
                    aspectRatio: "3 / 4",
                    boxShadow: SOMBRA,
                  }}
                >
                  <Moldura rotulo="" raio="calc(var(--raio) / 1.5)" />
                </div>
              ))}
            </div>
            <span
              style={{
                flex: "none",
                fontSize: "0.75rem",
                color: "var(--ink-3)",
                fontVariantNumeric: "tabular-nums",
                whiteSpace: "nowrap",
              }}
            >
              {faixa.fotos} fotos
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
