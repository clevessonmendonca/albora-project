"use client";

import { cn } from "@albora/ui-web";
import { hourLabel, type HourGroup } from "@/features/feed/lib/group-by-hour";
import type { MediaUrl } from "@/lib/media";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/** Cada círculo é uma hora, não uma pessoa — 200 convidados dariam 200 alvos. Nenhuma contagem: antes do gate não chega do servidor, e depois seria placar de popularidade. */

const CLASSE_TIRA =
  "mx-[calc(var(--espaco)*-5)] mb-4 flex gap-5 overflow-x-auto px-[calc(var(--espaco)*5)] [scrollbar-width:none]";

export function HourStrip({
  grupos,
  urls,
  vistos,
  preparando,
  rotulo,
  onAbrir,
}: {
  grupos: HourGroup<ItemVisivel>[];
  urls: Map<string, MediaUrl>;
  vistos: ReadonlySet<number>;
  preparando: number | null;
  rotulo: string;
  onAbrir: (grupo: HourGroup<ItemVisivel>) => void;
}) {
  return (
    <div role="group" aria-label={rotulo} className={CLASSE_TIRA}>
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
      aria-label={`Ver ${hourLabel(hora)}`}
      className={cn(
        "flex w-15 flex-none flex-col items-center gap-1.5 border-none bg-transparent p-0 font-inherit text-ink rounded-md",
        "[transition:opacity_var(--tempo-rapido)_var(--curva)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-acento focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        bloqueado ? "cursor-default opacity-45" : "cursor-pointer opacity-100",
      )}
    >
      <span
        className={cn(
          "block size-14 rounded-full p-0.5",
          visto ? "bg-linha" : "bg-acento",
        )}
      >
        <span className="relative block size-full overflow-hidden rounded-full bg-superficie">
          {url && (
            <>
              {/* A própria foto desfocada preenche o círculo, e a foto inteira
                  fica por cima em `contain`: o círculo do Instagram sem cortar
                  cabeça, que é o modelo Ambiente do `quadro.tsx` em miniatura. */}
              <img
                src={url}
                alt=""
                aria-hidden
                className="absolute inset-0 size-full scale-[1.2] object-cover blur-sm saturate-[0.7] brightness-[0.5]"
              />
              <img
                src={url}
                alt=""
                aria-hidden
                loading="lazy"
                decoding="async"
                className="absolute inset-0 size-full object-contain"
              />
            </>
          )}
        </span>
      </span>

      <span
        className={cn(
          "text-center text-[0.5625rem] leading-[1.2]",
          visto ? "text-ink-3" : "text-ink-2",
        )}
      >
        {abrindo ? "…" : hourLabel(hora)}
      </span>
    </button>
  );
}

/** Enquanto a primeira página não chega, a tira é o próprio contorno dos anéis. */
export function HourStripLoading() {
  return (
    <div aria-hidden className={CLASSE_TIRA}>
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="feed-esperando block size-14 flex-none rounded-full border border-linha"
        />
      ))}
    </div>
  );
}
