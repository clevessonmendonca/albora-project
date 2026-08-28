import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { cn } from "@albora/ui-web";
import React, { type CSSProperties } from "react";
import { hourLabel } from "@/features/feed/lib/group-by-hour";
import { Frame } from "./pieces";

function Finder({ corner, pupil }: { corner: CSSProperties; pupil: string }) {
  return (
    <span
      className="absolute grid w-[30%] place-items-center bg-ink"
      style={{ height: "30%", ...corner }}
    >
      <span className="grid h-[60%] w-[60%] place-items-center bg-bg">
        <span className="bg-ink" style={{ width: pupil, height: pupil }} />
      </span>
    </span>
  );
}

/** `cell` é % do módulo — com 13% num QR de 40px os finders somem e o código vai a branco; peças pequenas precisam de módulo grande. */
export function Qr({ size, cell = "13.5%" }: { size: string; cell?: string }) {
  return (
    <span
      className="block rounded-[calc(var(--raio)/2)] border border-ink-borda bg-bg p-[7%]"
      style={{ width: size, height: size }}
    >
      <span
        className="relative block h-full w-full bg-bg"
        style={{
          backgroundImage: "repeating-conic-gradient(var(--ink) 0 25%, var(--bg) 0 50%)",
          backgroundSize: `${cell} ${cell}`,
        }}
      >
        <Finder corner={{ top: 0, left: 0 }} pupil="55%" />
        <Finder corner={{ top: 0, right: 0 }} pupil="55%" />
        <Finder corner={{ bottom: 0, left: 0 }} pupil="55%" />
      </span>
    </span>
  );
}

/** Chão escuro pelo mesmo resolvedor do app às 23h (não paleta invertida); margem inferior mais larga — margens iguais viram moldura, não polaroid. */
export function Polaroid({
  caption,
  rotation,
  src,
  variant = 0,
  width = "min(13.5rem, 44vw)",
}: {
  caption: string;
  rotation: string;
  src?: string;
  variant?: number;
  width?: string;
}) {
  const night = resolveTokens({ marca: ALBORA_BRAND, pack: { background: "dark" } });

  return (
    <figure
      className="polaroide m-0 shrink-0 bg-superficie-alta px-[0.6875rem] pt-[0.6875rem] shadow-alta"
      style={{ width, transform: `rotate(${rotation})` }}
    >
      <div
        className="relative aspect-square"
        style={toVariables(night) as CSSProperties}
      >
        <Frame label="" radius="0rem" atmosphere variant={variant} {...(src ? { src } : {})} />
      </div>
      <figcaption className="px-0.5 pb-[1.125rem] pt-[0.9375rem] text-center text-[0.625rem] uppercase tracking-rotulo text-ink-3">
        {caption}
      </figcaption>
    </figure>
  );
}

/** Chão escuro em slot de festa — slot claro sobre papel claro some, e slot sumido anuncia capítulo sem fotos. */
export function NightSlot({
  variant,
  ratio,
  radius: curvature = "0rem",
}: {
  variant: number;
  ratio: string;
  radius?: string;
}) {
  const night = resolveTokens({ marca: ALBORA_BRAND, pack: { background: "dark" } });

  return (
    <div
      className="relative"
      style={{
        ...(toVariables(night) as CSSProperties),
        aspectRatio: ratio,
      }}
    >
      <Frame label="" radius={curvature} atmosphere variant={variant} />
    </div>
  );
}

/** The fan of copies on the table, overlapping as if someone spread them. */
export function PolaroidFan({
  copies,
}: {
  copies: readonly { caption: string; rotation: string; src?: string }[];
}) {
  return (
    <div className="leque">
      {copies.map((c, i) => (
        <Polaroid key={c.caption} variant={i} {...c} />
      ))}
    </div>
  );
}

function Paper({
  children,
  ratio,
  className,
}: {
  children: React.ReactNode;
  ratio: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-token bg-bg p-[var(--espaco)] font-corpo text-ink shadow-suave",
        className,
      )}
      style={{ aspectRatio: ratio }}
    >
      {children}
    </div>
  );
}

/** Vive dentro do escopo CSS do chamador — o cascade troca a identidade das quatro peças sem prop threading a quatro componentes. */
export function Stationery({ example }: { example: string }) {
  return (
    <div className="grid auto-rows-start grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-[clamp(0.875rem,2vw,1.5rem)]">
      <figure className="m-0">
        <Paper ratio="5 / 7" className="items-center gap-3 text-center">
          <span className="font-titulo text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
            {example}
          </span>
          <span className="grid min-h-0 w-full flex-1 place-items-center">
            <Qr size="min(7rem, 62%)" />
          </span>
          <span className="font-titulo text-[clamp(0.9375rem,1.5vw,1.1875rem)] leading-[1.15] tracking-titulo">
            Aponte a câmera
          </span>
          <span className="text-[0.6875rem] leading-[1.4] text-ink-2">
            As fotos desta noite ficam todas no mesmo lugar
          </span>
        </Paper>
        <Caption>A placa da mesa</Caption>
      </figure>

      <figure className="m-0">
        <Paper ratio="5 / 7" className="gap-[0.6875rem]">
          <span className="font-titulo text-[0.625rem] uppercase tracking-rotulo text-acento-texto">
            Para quem estava lá
          </span>
          <span className="font-titulo text-[clamp(0.9375rem,1.6vw,1.25rem)] leading-[1.18] tracking-titulo">
            Você vai ver coisas hoje que mais ninguém vai ver.
          </span>
          <span className="flex-1 text-[0.6875rem] leading-normal text-ink-2">
            Fotografe do seu jeito. Tudo cai no mesmo álbum, e no fim da noite ele é de todo mundo
            que estava aqui.
          </span>
          <span className="flex items-center gap-2 border-t border-linha pt-2.5">
            <Qr size="2.5rem" cell="25%" />
            <span className="text-[0.625rem] leading-[1.3] text-ink-3">{example}</span>
          </span>
        </Paper>
        <Caption>A carta do convite</Caption>
      </figure>

      <figure className="m-0">
        <Paper ratio="5 / 7" className="justify-between bg-acento text-sobre-acento">
          <span className="font-titulo text-[clamp(1.0625rem,1.9vw,1.5rem)] leading-[1.1] tracking-titulo">
            A noite inteira,
            <br />
            vista por dentro.
          </span>
          <span className="flex items-center gap-[0.6875rem]">
            <Qr size="2.75rem" cell="25%" />
            <span className="font-titulo text-[0.75rem] italic leading-[1.25]">
              aponte
              <br />a câmera
            </span>
          </span>
        </Paper>
        <Caption>O selo do envelope</Caption>
      </figure>

      <figure className="m-0">
        <Paper ratio="5 / 7" className="gap-0 p-0">
          <span className="relative min-h-0 flex-1">
            <Frame label="" radius="var(--raio)" />
          </span>
          <span className="flex flex-col gap-[0.1875rem] px-[var(--espaco)] pb-[var(--espaco)] pt-3">
            <span className="font-titulo text-[clamp(0.875rem,1.4vw,1.0625rem)] tracking-titulo">
              {example}
            </span>
            <span className="text-[0.625rem] text-ink-3">O livro impresso, mesma capa</span>
          </span>
        </Paper>
        <Caption>A capa do livro</Caption>
      </figure>
    </div>
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <figcaption className="mt-3 text-center text-[0.6875rem] uppercase tracking-rotulo text-ink-2">
      {children}
    </figcaption>
  );
}

/** Slots, nunca posicionamento livre — CLAUDE.md recusa canvas editor; landing com foto arrastável prometeria a ferramenta errada. */
export function OpenAlbum() {
  return (
    <div className="grid grid-cols-2 gap-0.5 overflow-hidden rounded-superficie bg-ink-superficie p-0.5 shadow-alta">
      <div className="grid aspect-[3/4] grid-cols-2 grid-rows-[1.35fr_1fr_auto] gap-2 bg-bg p-[clamp(0.75rem,1.8vw,1.375rem)]">
        <div className="col-span-2">
          <NightSlot variant={2} ratio="16 / 11" radius="calc(var(--raio) / 1.5)" />
        </div>
        <NightSlot variant={5} ratio="1" radius="calc(var(--raio) / 1.5)" />
        <NightSlot variant={8} ratio="1" radius="calc(var(--raio) / 1.5)" />
        <p className="col-span-2 m-0 font-titulo text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
          {hourLabel(23)} · a mesa
        </p>
      </div>

      <div className="grid aspect-[3/4] grid-rows-[1fr_auto] gap-2 bg-bg p-[clamp(0.75rem,1.8vw,1.375rem)]">
        <NightSlot variant={11} ratio="3 / 4" radius="calc(var(--raio) / 1.5)" />
        <p className="m-0 font-titulo text-[clamp(0.8125rem,1.5vw,1.0625rem)] font-light leading-[1.3] tracking-titulo text-ink-2">
          Ninguém pediu esta foto. Ela apareceu.
        </p>
      </div>
    </div>
  );
}

/** Bandas de `hourLabel` — mesma função do álbum real; formato muda lá, muda aqui. */
const NIGHT = [
  { hour: 19, title: "A chegada", photos: 34, strips: 3 },
  { hour: 21, title: "A mesa", photos: 118, strips: 6 },
  { hour: 23, title: "A pista", photos: 306, strips: 11 },
  { hour: 2, title: "O fim", photos: 89, strips: 5 },
] as const;

export function Timeline() {
  return (
    <div className="flex flex-col">
      {NIGHT.map((band, i) => (
        <div
          key={band.hour}
          className={cn(
            "grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-[clamp(0.875rem,2.5vw,2rem)] py-[clamp(0.875rem,2vw,1.375rem)]",
            i > 0 && "border-t border-linha",
          )}
        >
          <div>
            <p className="m-0 font-titulo text-[clamp(1.125rem,2.2vw,1.625rem)] font-light tabular-nums leading-none tracking-titulo text-acento-texto">
              {hourLabel(band.hour)}
            </p>
            <p className="mt-[0.3125rem] text-xs text-ink-3">{band.title}</p>
          </div>

          <div className="flex min-w-0 items-center gap-[0.875rem]">
            <div className="faixa-fotos flex min-w-0 gap-[0.3125rem]">
              {Array.from({ length: band.strips }, (_, n) => (
                <div
                  key={n}
                  className="h-[clamp(2.75rem,5.5vw,4.25rem)] shrink-0 shadow-suave"
                >
                  <NightSlot variant={band.hour + n} ratio="3 / 4" />
                </div>
              ))}
            </div>
            <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-ink-3">
              {band.photos} fotos
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
