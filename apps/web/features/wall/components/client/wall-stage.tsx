import { ehMimeVideo } from "@albora/core";
import { cn } from "@albora/ui-web";
import type { Cena, ItemApi } from "../../lib/types";

const PALCO =
  "absolute inset-0 flex items-center justify-center gap-[clamp(0.75rem,2vw,2rem)] p-[clamp(1.5rem,4vw,4rem)]";

const FUNDO_AMBIENTE =
  "absolute -inset-[8%] h-[116%] w-[116%] object-cover blur-[48px] brightness-[0.55]";

export function WallStage({
  cena,
  itemDe,
}: {
  cena: Cena;
  itemDe: (id: string) => ItemApi | undefined;
}) {
  const itens = cena.ids.map(itemDe).filter((i): i is ItemApi => Boolean(i));
  if (itens.length === 0) return null;

  if (cena.modelo === "cheio") {
    const only = itens[0]!;
    return (
      <div className="absolute inset-0">
        <MidiaPalco src={only.full} mime={only.mime} enquadrar="cover" />
        <Credito autor={only.autor} reacoes={only.reacoes} />
      </div>
    );
  }

  if (cena.modelo === "ambiente") {
    const only = itens[0]!;
    return (
      <div className="absolute inset-0 overflow-hidden">
        {ehMimeVideo(only.mime) ? (
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
          <MidiaPalco src={only.full} mime={only.mime} enquadrar="contain" />
        </div>
        <Credito autor={only.autor} reacoes={only.reacoes} />
      </div>
    );
  }

  if (cena.modelo === "polaroide" || cena.modelo === "carrossel" || cena.modelo === "tbt") {
    const only = itens[0]!;
    const emoldurado = cena.modelo !== "carrossel";
    return (
      <div className={PALCO}>
        <figure
          className={cn(
            "m-0 flex max-h-[88vh] max-w-[min(70vw,60vh)] flex-col items-center",
            emoldurado
              ? "rounded-superficie bg-superficie p-[clamp(0.75rem,1.5vw,1.5rem)] shadow-polaroide"
              : "bg-transparent p-0 shadow-none",
          )}
        >
          {cena.modelo === "tbt" && (
            <figcaption className="mb-2 self-start font-titulo text-[clamp(0.9rem,1.6vw,1.3rem)] uppercase tracking-rotulo text-acento">
              Mais cedo, na festa
            </figcaption>
          )}
          <MidiaPalco src={only.full} mime={only.mime} enquadrar="contain" />
          <figcaption
            className={cn(
              "mt-3 flex w-full justify-between gap-4 text-[clamp(0.8rem,1.4vw,1.1rem)]",
              emoldurado ? "text-ink-2" : "text-ink",
            )}
          >
            <span>{only.autor}</span>
            {only.reacoes > 0 && <span className="text-acento">★ {only.reacoes}</span>}
          </figcaption>
        </figure>
      </div>
    );
  }

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
          <MidiaPalco src={it.full} mime={it.mime} enquadrar="contain" />
        </div>
      ))}
    </div>
  );
}

function MidiaPalco({
  src,
  mime,
  enquadrar,
}: {
  src: string;
  mime: string;
  enquadrar: "contain" | "cover";
}) {
  const classes = cn(
    "block rounded-superficie",
    enquadrar === "contain"
      ? "h-auto max-h-full w-auto max-w-full object-contain"
      : "h-full w-full object-cover",
  );

  if (ehMimeVideo(mime)) {
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

  return <img src={src} alt="" className={classes} />;
}

function Credito({ autor, reacoes }: { autor: string; reacoes: number }) {
  return (
    <div
      className={cn(
        "absolute bottom-[clamp(1rem,3vw,3rem)] left-[clamp(1rem,3vw,3rem)]",
        "flex items-center gap-3 rounded-pilula px-4 py-2 backdrop-blur",
        "bg-bg-overlay-medio text-[clamp(0.85rem,1.4vw,1.15rem)] text-ink",
      )}
    >
      <span>{autor}</span>
      {reacoes > 0 && <span className="text-acento">★ {reacoes}</span>}
    </div>
  );
}
