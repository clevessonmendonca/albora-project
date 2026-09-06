import { isVideoMime } from "@albora/core";
import { cn } from "@albora/ui-web";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { Cena, ItemApi } from "../../lib/types";

const PALCO =
  "absolute inset-0 flex items-center justify-center gap-[clamp(0.75rem,2vw,2rem)] p-[clamp(1.5rem,4vw,4rem)]";

const FUNDO_AMBIENTE =
  "absolute -inset-[8%] h-[116%] w-[116%] object-cover blur-[48px] brightness-[0.55] parede-deriva";

/** Gap entre células dos layouts de grade — valor único para todos os modelos. */
const GAP = "clamp(0.5rem,1.5vw,1.5rem)";

/** Preenche o letterbox com blur da própria imagem — foto em pé (`contain`) sem barras pretas e sem decapar o rosto no topo. A deriva lenta (`parede-deriva`, definida em `wall-client`) dá ambiente sem nunca revelar corte. */
function FundoDesfocado({ src, mime }: { src: string; mime: string }) {
  const cls =
    "absolute inset-0 h-full w-full object-cover blur-[40px] brightness-[0.35] parede-deriva";
  if (isVideoMime(mime)) {
    return (
      <video src={src} autoPlay muted playsInline loop aria-hidden className={cls} />
    );
  }
  return <img src={src} alt="" aria-hidden className={cls} />;
}

/** Célula individual: contain + fundo desfocado. Nunca corta faces. */
function CelulaContida({
  item,
  className,
  style,
}: {
  item: ItemApi;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={cn("relative overflow-hidden", className)} style={style}>
      <FundoDesfocado src={item.full} mime={item.mime} />
      <div className="relative z-10 flex h-full w-full items-center justify-center">
        <MidiaPalco
          src={item.full}
          mime={item.mime}
          enquadrar="contain"
          largura={item.largura}
          altura={item.altura}
        />
      </div>
    </div>
  );
}

/** Legenda de autor/reações — pílula quente, nunca vidro. Some para dentro em toda cena. */
function creditoClasses() {
  return cn(
    "absolute bottom-[clamp(1rem,3vw,3rem)] left-[clamp(1rem,3vw,3rem)]",
    "flex items-center gap-3 rounded-pilula px-4 py-2",
    "tipo-body bg-bg-overlay-medio text-ink shadow-suave parede-subir",
    "text-[clamp(0.85rem,1.4vw,1.15rem)]",
  );
}

export function WallStage({
  cena,
  itemDe,
}: {
  cena: Cena;
  itemDe: (id: string) => ItemApi | undefined;
}) {
  const itens = cena.ids.map(itemDe).filter((i): i is ItemApi => Boolean(i));
  if (itens.length === 0) return null;

  // --- cheio: sangramento total — só aceita horizontal, sem contain ---
  if (cena.modelo === "cheio") {
    const only = itens[0]!;
    return (
      <div className="absolute inset-0 overflow-hidden">
        {/* Ken Burns sutil só em foto parada — vídeo já tem o próprio movimento. */}
        <div className={cn("absolute inset-0", !isVideoMime(only.mime) && "parede-zoom")}>
          <MidiaPalco src={only.full} mime={only.mime} enquadrar="cover" priority />
        </div>
        <Credito autor={only.autor} reacoes={only.reacoes} />
      </div>
    );
  }

  // --- ambiente: 1 foto contain + fundo desfocado ---
  if (cena.modelo === "ambiente") {
    const only = itens[0]!;
    return (
      <div className="absolute inset-0 overflow-hidden">
        {isVideoMime(only.mime) ? (
          <video
            src={only.full}
            autoPlay
            muted
            playsInline
            loop
            aria-hidden
            className={FUNDO_AMBIENTE}
          />
        ) : (
          <img src={only.full} alt="" aria-hidden className={FUNDO_AMBIENTE} />
        )}
        <div className={PALCO}>
          <MidiaPalco
            src={only.full}
            mime={only.mime}
            enquadrar="contain"
            largura={only.largura}
            altura={only.altura}
            priority
            elevar
          />
        </div>
        <Credito autor={only.autor} reacoes={only.reacoes} />
      </div>
    );
  }

  // --- carrossel: 1 foto contain + blur bg, fade-in a cada troca ---
  if (cena.modelo === "carrossel") {
    const only = itens[0]!;
    return (
      <div
        key={only.id}
        className="absolute inset-0 overflow-hidden"
        style={{ animation: "wall-aparecer var(--tempo-lento) var(--curva)" }}
      >
        <FundoDesfocado src={only.full} mime={only.mime} />
        <div className={cn(PALCO, "relative z-10")}>
          <MidiaPalco
            src={only.full}
            mime={only.mime}
            enquadrar="contain"
            largura={only.largura}
            altura={only.altura}
            priority
            elevar
          />
        </div>
        <Credito autor={only.autor} reacoes={only.reacoes} />
      </div>
    );
  }

  // --- polaroide / tbt: emoldurado, 1 foto ---
  if (cena.modelo === "polaroide" || cena.modelo === "tbt") {
    const only = itens[0]!;
    return (
      <div className={PALCO}>
        <figure className="m-0 flex max-h-[88vh] max-w-[min(70vw,60vh)] flex-col items-center rounded-superficie bg-superficie p-[clamp(0.75rem,1.5vw,1.5rem)] shadow-polaroide">
          {cena.modelo === "tbt" && (
            <figcaption className="tipo-label mb-2 self-start font-titulo text-[clamp(0.9rem,1.6vw,1.3rem)] uppercase tracking-rotulo text-acento">
              Mais cedo, na festa
            </figcaption>
          )}
          <MidiaPalco
            src={only.full}
            mime={only.mime}
            enquadrar="contain"
            largura={only.largura}
            altura={only.altura}
            priority
          />
          <figcaption className="tipo-body mt-3 flex w-full justify-between gap-4 text-[clamp(0.8rem,1.4vw,1.1rem)] text-ink-2">
            <span>{only.autor}</span>
            {only.reacoes > 0 && <span className="text-acento">★ {only.reacoes}</span>}
          </figcaption>
        </figure>
      </div>
    );
  }

  // --- grade: 2×2 grid, cada célula contain + blur bg ---
  if (cena.modelo === "grade") {
    return (
      <div
        className={cn(PALCO, "grid grid-cols-2 grid-rows-2")}
        style={{ gap: GAP }}
      >
        {itens.map((it) => (
          <CelulaContida key={it.id} item={it} className="rounded-superficie shadow-suave" />
        ))}
      </div>
    );
  }

  // --- destaque: hero esquerda 2/3 + quatro pequenas direita 1/3 (2×2) ---
  if (cena.modelo === "destaque") {
    const [hero, s1, s2, s3, s4] = itens;
    return (
      <div
        className={PALCO}
        style={{
          display: "grid",
          gridTemplateAreas: '"hero s1 s2" "hero s3 s4"',
          gridTemplateColumns: "2fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: GAP,
        }}
      >
        {hero && (
          <CelulaContida
            item={hero}
            className="rounded-superficie shadow-alta"
            style={{ gridArea: "hero" }}
          />
        )}
        {([s1, s2, s3, s4] as const).map((it, i) =>
          it ? (
            <CelulaContida
              key={it.id}
              item={it}
              className="rounded-superficie shadow-suave"
              style={{ gridArea: (["s1", "s2", "s3", "s4"] as const)[i] }}
            />
          ) : null,
        )}
      </div>
    );
  }

  // --- mosaico: tríptico — 2 laterais + hero central (double-wide) + 2 laterais ---
  if (cena.modelo === "mosaico") {
    const [hero, sm1, sm2, sm3, sm4] = itens;
    return (
      <div
        className={PALCO}
        style={{
          display: "grid",
          gridTemplateAreas: '"sm1 hero sm3" "sm2 hero sm4"',
          gridTemplateColumns: "1fr 2fr 1fr",
          gridTemplateRows: "1fr 1fr",
          gap: GAP,
        }}
      >
        {hero && (
          <CelulaContida
            item={hero}
            className="rounded-superficie shadow-alta"
            style={{ gridArea: "hero" }}
          />
        )}
        {([sm1, sm2, sm3, sm4] as const).map((it, i) =>
          it ? (
            <CelulaContida
              key={it.id}
              item={it}
              className="rounded-superficie shadow-suave"
              style={{ gridArea: (["sm1", "sm2", "sm3", "sm4"] as const)[i] }}
            />
          ) : null,
        )}
      </div>
    );
  }

  // --- mural / colagem / dump: grade simples sem blur bg ---
  const colunas = 3;
  const linhas = cena.modelo === "mural" ? 1 : cena.modelo === "colagem" ? 2 : 3;
  return (
    <div
      className={cn(PALCO, "grid")}
      style={{
        gridTemplateColumns: `repeat(${colunas}, 1fr)`,
        gridTemplateRows: `repeat(${linhas}, 1fr)`,
      }}
    >
      {itens.map((it) => (
        <div
          key={it.id}
          className="relative flex min-h-0 min-w-0 items-center justify-center"
        >
          <MidiaPalco
            src={it.full}
            mime={it.mime}
            enquadrar="contain"
            largura={it.largura}
            altura={it.altura}
            elevar
          />
        </div>
      ))}
    </div>
  );
}

function MidiaPalco({
  src,
  mime,
  enquadrar,
  largura,
  altura,
  priority = false,
  elevar = false,
}: {
  src: string;
  mime: string;
  enquadrar: "contain" | "cover";
  largura?: number | undefined;
  altura?: number | undefined;
  priority?: boolean;
  /** Sombra quente por baixo da mídia — separa do próprio fundo desfocado sem vidro. */
  elevar?: boolean;
}) {
  const classes = cn(
    "block rounded-superficie",
    enquadrar === "contain"
      ? "h-auto max-h-full w-auto max-w-full object-contain"
      : "h-full w-full object-cover",
    elevar && "shadow-suave",
  );

  if (isVideoMime(mime)) {
    return (
      <video
        src={src}
        autoPlay
        muted
        playsInline
        loop
        className={classes}
      />
    );
  }

  if (enquadrar === "cover") {
    return (
      <Image src={src} alt="" fill sizes="100vw" priority={priority} className={classes} />
    );
  }

  return (
    <Image
      src={src}
      alt=""
      width={largura ?? 1600}
      height={altura ?? 1200}
      sizes="100vw"
      priority={priority}
      className={classes}
    />
  );
}

function Credito({ autor, reacoes }: { autor: string; reacoes: number }) {
  return (
    <div className={creditoClasses()}>
      <span>{autor}</span>
      {reacoes > 0 && <span className="text-acento">★ {reacoes}</span>}
    </div>
  );
}
