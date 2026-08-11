"use client";

import { rotuloDeHora, type GrupoDeHora } from "@/lib/agrupar-por-hora";
import type { UrlDeMidia } from "@/lib/midia";
import type { ItemVisivel } from "@/lib/usar-feed";

/**
 * A tira de horas no topo do feed.
 *
 * Cada círculo é **uma hora da festa**, não uma pessoa. Num casamento de 200
 * convidados, um círculo por convidado seriam 200 alvos de 76px com uma foto
 * cada; a hora dá de quatro a seis, e é o recorte que a pessoa reconhece —
 * chegou, dançou, brindou ([`agrupar-por-hora.ts`](../../../../lib/agrupar-por-hora.ts)).
 *
 * Nenhuma contagem aparece aqui. Antes do gate ela nem chega do servidor, e
 * mostrar "14 fotos" às 23h seria placar de popularidade numa festa.
 */

const DIAMETRO = "4.75rem";

export function Tira({
  grupos,
  urls,
  vistos,
  preparando,
  rotulo,
  onAbrir,
}: {
  grupos: GrupoDeHora<ItemVisivel>[];
  urls: Map<string, UrlDeMidia>;
  vistos: ReadonlySet<number>;
  preparando: number | null;
  rotulo: string;
  onAbrir: (grupo: GrupoDeHora<ItemVisivel>) => void;
}) {
  return (
    <div
      role="group"
      aria-label={rotulo}
      style={{
        display: "flex",
        gap: "calc(var(--espaco) * 3.5)",
        overflowX: "auto",
        scrollbarWidth: "none",
        // Sangra até a borda da tela para o último círculo não parecer o fim.
        margin: "0 calc(var(--espaco) * -5)",
        padding: "calc(var(--espaco) * 1) calc(var(--espaco) * 5)",
      }}
    >
      {grupos.map((grupo) => {
        const inicio = grupo.inicio.getTime();
        const capa = grupo.itens[grupo.itens.length - 1];
        const url = capa ? urls.get(capa.chaveThumb)?.url : undefined;

        return (
          <Circulo
            key={inicio}
            url={url}
            hora={grupo.hora}
            visto={vistos.has(inicio)}
            abrindo={preparando === inicio}
            bloqueado={preparando !== null && preparando !== inicio}
            onAbrir={() => onAbrir(grupo)}
          />
        );
      })}
    </div>
  );
}

function Circulo({
  url,
  hora,
  visto,
  abrindo,
  bloqueado,
  onAbrir,
}: {
  url: string | undefined;
  hora: number;
  visto: boolean;
  abrindo: boolean;
  bloqueado: boolean;
  onAbrir: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onAbrir}
      disabled={bloqueado}
      aria-label={`Ver ${rotuloDeHora(hora)}`}
      style={{
        font: "inherit",
        flex: "none",
        display: "grid",
        justifyItems: "center",
        gap: "calc(var(--espaco) * 1.5)",
        padding: 0,
        border: "none",
        background: "transparent",
        color: "var(--ink)",
        cursor: bloqueado ? "default" : "pointer",
        opacity: bloqueado ? 0.45 : 1,
        transition: "opacity var(--tempo-rapido) var(--curva)",
      }}
    >
      <span
        style={{
          display: "block",
          width: DIAMETRO,
          height: DIAMETRO,
          padding: "3px",
          borderRadius: "var(--raio-pilula)",
          // O anel é filete de acento — o gradiente roxo do Instagram é
          // anti-padrão bloqueante, e âmbar é metal, nunca preenchimento.
          border: visto ? "1px solid var(--linha)" : "1.5px solid var(--acento)",
        }}
      >
        <span
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            borderRadius: "var(--raio-pilula)",
            background: "var(--superficie)",
          }}
        >
          {url && (
            <>
              {/* A própria foto desfocada preenche o círculo, e a foto inteira
                  fica por cima em `contain`: o círculo do Instagram sem cortar
                  cabeça, que é o modelo Ambiente do `quadro.tsx` em miniatura. */}
              <img
                src={url}
                alt=""
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scale(1.2)",
                  filter: "blur(8px) saturate(0.7) brightness(0.5)",
                }}
              />
              <img
                src={url}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "contain",
                }}
              />
            </>
          )}
        </span>
      </span>

      <span
        style={{
          fontFamily: "var(--fonte-titulo)",
          fontSize: "0.66rem",
          fontWeight: 400,
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: visto ? "var(--ink-3)" : "var(--ink-2)",
        }}
      >
        {abrindo ? "…" : rotuloDeHora(hora)}
      </span>
    </button>
  );
}

/** Enquanto a primeira página não chega, a tira é o próprio contorno dos anéis. */
export function TiraCarregando() {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        gap: "calc(var(--espaco) * 3.5)",
        margin: "0 calc(var(--espaco) * -5)",
        padding: "calc(var(--espaco) * 1) calc(var(--espaco) * 5)",
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="feed-esperando"
          style={{
            flex: "none",
            display: "block",
            width: DIAMETRO,
            height: DIAMETRO,
            borderRadius: "var(--raio-pilula)",
            border: "1px solid var(--linha)",
          }}
        />
      ))}
    </div>
  );
}
