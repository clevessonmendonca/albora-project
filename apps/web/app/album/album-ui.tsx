"use client";

import type { CSSProperties } from "react";
import type { AlbumServido, PaginaServida } from "@/lib/album";
import { Moldura, raio } from "../landing/pecas";
import { CabecalhoConvidado, ChaoConvidado, MioloConvidado } from "../telas/shell-convidado";
import { Pilula } from "../telas/pecas-de-tela";

/**
 * O álbum da noite, desenhado (spec 016).
 *
 * O acervo organizado pela hora, não por grade nem por feed. A diagramação é
 * a do núcleo: cada página é um layout de slots com fração declarada, e esta
 * tela **desenha** esses slots — nunca posiciona foto livre, nunca escolhe
 * corte. Um slot recusa a proporção que não é a dele, então cada quadro recebe
 * a razão do seu slot e a foto entra sem perder o topo.
 *
 * Três regras de tela saem direto da spec, e nenhuma é enfeite:
 *
 * - **Disco redondo, não miniatura quadrada.** O recorte circular é gentil com
 *   foto torta na navegação da linha do tempo.
 * - **O amanhecer é a única faixa em âmbar, com anel no disco.** Fecha o arco
 *   da noite; o resto da trilha é neutro.
 * - **Sem contagem de reação e sem rolagem infinita.** O corpo do álbum nem
 *   recebe a contagem do servidor, e a página termina — não puxa sozinha.
 *
 * Nenhuma cor literal e nenhuma palavra de domínio: tudo sai de token, e a
 * cópia é genérica.
 */

const RAZAO_DO_SLOT: Readonly<Record<string, string>> = {
  retrato: "9 / 16",
  paisagem: "16 / 9",
  quadrado: "1 / 1",
};

function razaoDe(proporcao: string): string {
  return RAZAO_DO_SLOT[proporcao] ?? "1 / 1";
}

function rotuloDaHora(hora: number | null): string {
  return hora === null ? "durante a festa" : `${hora}h`;
}

type MarcaDaLinha = { chave: string; rotulo: string; amanhecer: boolean; variante: number };

/**
 * A linha do tempo sai das próprias páginas: cada hora distinta vira uma marca,
 * na ordem em que a noite aconteceu. Sem plano de capítulos persistido, é a hora
 * que estrutura — que é o que a spec promete organizar.
 */
function linhaDoTempo(album: AlbumServido): MarcaDaLinha[] {
  const marcas: MarcaDaLinha[] = [];
  const vistas = new Set<string>();
  let variante = 0;

  for (const capitulo of album.capitulos) {
    for (const pagina of capitulo.paginas) {
      const chave = `${capitulo.id}|${pagina.inicioDaHora ?? pagina.hora ?? "sem-hora"}`;
      if (vistas.has(chave)) continue;
      vistas.add(chave);
      marcas.push({
        chave,
        rotulo: rotuloDaHora(pagina.hora),
        amanhecer: pagina.amanhecer,
        variante: variante++,
      });
    }
  }

  return marcas;
}

function Contador({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
        padding: "0.875rem 0.5rem",
        ...raio("var(--raio)"),
        backgroundColor: "var(--superficie)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontWeight: 300,
          fontSize: "1.75rem",
          lineHeight: 1,
          color: "var(--acento-texto)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {valor}
      </span>
      <span
        style={{
          fontSize: "0.625rem",
          letterSpacing: "var(--tracking-rotulo)",
          textTransform: "uppercase",
          color: "var(--ink-2)",
        }}
      >
        {rotulo}
      </span>
    </span>
  );
}

function Disco({ marca }: { marca: MarcaDaLinha }) {
  const anel: CSSProperties = marca.amanhecer
    ? { backgroundColor: "var(--acento)" }
    : { backgroundColor: "var(--linha)" };

  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.375rem",
        flex: "none",
        width: "4rem",
      }}
    >
      <span style={{ width: "3.5rem", height: "3.5rem", borderRadius: "50%", padding: "2px", ...anel }}>
        <span
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
          }}
        >
          <Moldura rotulo="" raio="50%" atmosfera variante={marca.variante * 5} />
        </span>
      </span>
      <span
        style={{
          fontSize: "0.625rem",
          textAlign: "center",
          lineHeight: 1.2,
          color: marca.amanhecer ? "var(--acento-texto)" : "var(--ink-2)",
        }}
      >
        {marca.rotulo}
      </span>
    </span>
  );
}

function Pagina({ pagina }: { pagina: PaginaServida }) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.5rem",
          margin: "0 0 0.5rem",
        }}
      >
        <span
          style={{
            fontSize: "0.6875rem",
            letterSpacing: "var(--tracking-rotulo)",
            textTransform: "uppercase",
            color: pagina.amanhecer ? "var(--acento-texto)" : "var(--ink-3)",
          }}
        >
          {rotuloDaHora(pagina.hora)}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.375rem",
          alignItems: "flex-start",
          ...(pagina.amanhecer
            ? {
                padding: "0.375rem",
                ...raio("var(--raio)"),
                backgroundColor: "color-mix(in srgb, var(--acento) 14%, transparent)",
              }
            : {}),
        }}
      >
        {pagina.fotos.map((foto) => (
          <span
            key={foto.id}
            style={{
              position: "relative",
              flexGrow: foto.slot.fracao,
              flexBasis: 0,
              aspectRatio: razaoDe(foto.slot.proporcao),
              overflow: "hidden",
              ...raio("var(--raio)"),
            }}
          >
            <Moldura rotulo="" raio="var(--raio)" atmosfera {...(foto.url ? { src: foto.url } : {})} />
          </span>
        ))}
      </div>
    </div>
  );
}

export function AlbumUI({ album }: { album: AlbumServido }) {
  const marcas = linhaDoTempo(album);
  const vazio = album.totalDePaginas === 0;
  const contagem = `${album.contadores.fotos} ${album.contadores.fotos === 1 ? "foto" : "fotos"}`;

  return (
    <ChaoConvidado>
      <MioloConvidado>
        <CabecalhoConvidado titulo="O álbum da noite" acao={<Pilula>{contagem}</Pilula>} />

        <div style={{ maxWidth: "34rem", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
          <Contador valor={album.contadores.fotos} rotulo="fotos" />
          <Contador valor={album.contadores.convidados} rotulo="convidados" />
          <Contador valor={album.contadores.missoes} rotulo="missões" />
        </div>

        {marcas.length > 0 ? (
          <div
            style={{
              display: "flex",
              gap: "0.625rem",
              overflowX: "auto",
              padding: "1.5rem 0 0.5rem",
            }}
          >
            {marcas.map((marca) => (
              <Disco key={marca.chave} marca={marca} />
            ))}
          </div>
        ) : null}

        {vazio ? (
          <p
            style={{
              margin: "2.5rem 0 0",
              textAlign: "center",
              lineHeight: 1.6,
              color: "var(--ink-2)",
            }}
          >
            Ainda não há fotos aqui. As primeiras da noite abrem o álbum.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", marginTop: "1.75rem" }}>
            {album.capitulos.map((capitulo) =>
              capitulo.paginas.map((pagina, i) => (
                <Pagina key={`${capitulo.id}-${i}`} pagina={pagina} />
              )),
            )}
          </div>
        )}
        </div>
      </MioloConvidado>
    </ChaoConvidado>
  );
}
