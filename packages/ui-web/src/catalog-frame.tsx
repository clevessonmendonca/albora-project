import type { CSSProperties, ReactNode } from "react";

export const ALTURA_APARELHO = 844;
export const LARGURA_APARELHO = 390;

export const LARGURA_PAREDE = 1180;
export const ALTURA_PAREDE = Math.round((LARGURA_PAREDE * 9) / 16);

const LARGURA_NAVEGADOR = 1180;
const ALTURA_CROMO_NAVEGADOR = 34;
const MOLDURA_PAREDE = 18;

function Legenda({ titulo, nota }: { titulo: string; nota: string }) {
  return (
    <>
      <p className="m-0 font-titulo text-[1.0625rem] tracking-titulo">{titulo}</p>
      <p className="mt-1.5 mb-0 text-[0.8125rem] leading-normal text-ink-2">{nota}</p>
    </>
  );
}

export function Aparelho({
  children,
  titulo,
  nota,
  escala = 0.78,
}: {
  children: ReactNode;
  titulo: string;
  nota: string;
  escala?: number;
}) {
  const larguraEscalada = LARGURA_APARELHO * escala;
  const alturaEscalada = ALTURA_APARELHO * escala;

  return (
    <figure
      className="m-0 flex flex-col gap-4"
      style={
        {
          "--catalogo-w": `${larguraEscalada}px`,
          "--catalogo-h": `${alturaEscalada}px`,
          "--catalogo-scale": String(escala),
          "--catalogo-largura": `${LARGURA_APARELHO}px`,
          "--catalogo-altura-aparelho": `${ALTURA_APARELHO}px`,
        } as CSSProperties
      }
    >
      <div className="flex-none h-[var(--catalogo-h)] w-[var(--catalogo-w)]">
        <div className="h-[var(--catalogo-altura-aparelho)] w-[var(--catalogo-largura)] origin-top-left scale-[var(--catalogo-scale)] rounded-[3.25rem] bg-ink p-3 shadow-aparelho">
          <div className="relative size-full overflow-hidden rounded-[2.625rem]">{children}</div>
        </div>
      </div>

      <figcaption className="max-w-[var(--catalogo-w)]">
        <Legenda titulo={titulo} nota={nota} />
      </figcaption>
    </figure>
  );
}

export function Navegador({
  children,
  titulo,
  nota,
  altura = 700,
  escala = 0.62,
}: {
  children: ReactNode;
  titulo: string;
  nota: string;
  altura?: number;
  escala?: number;
}) {
  const larguraEscalada = LARGURA_NAVEGADOR * escala;
  const alturaEscalada = (altura + ALTURA_CROMO_NAVEGADOR) * escala;

  return (
    <figure
      className="m-0 flex flex-col gap-4"
      style={
        {
          "--catalogo-w": `${larguraEscalada}px`,
          "--catalogo-h": `${alturaEscalada}px`,
          "--catalogo-scale": String(escala),
          "--catalogo-altura": `${altura}px`,
          "--catalogo-largura": `${LARGURA_NAVEGADOR}px`,
        } as CSSProperties
      }
    >
      <div className="flex-none h-[var(--catalogo-h)] w-[var(--catalogo-w)]">
        <div className="w-[var(--catalogo-largura)] origin-top-left scale-[var(--catalogo-scale)] overflow-hidden rounded-[0.875rem] bg-superficie-alta shadow-aparelho">
          <div className="flex h-[2.125rem] items-center gap-2 border-b border-linha px-3.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-2.5 rounded-full bg-linha" />
            ))}
          </div>
          <div className="relative h-[var(--catalogo-altura)] overflow-hidden">{children}</div>
        </div>
      </div>

      <figcaption className="max-w-[var(--catalogo-w)]">
        <Legenda titulo={titulo} nota={nota} />
      </figcaption>
    </figure>
  );
}

export function Parede({
  children,
  titulo,
  nota,
  escala = 0.46,
}: {
  children: ReactNode;
  titulo: string;
  nota: string;
  escala?: number;
}) {
  const externa = LARGURA_PAREDE + MOLDURA_PAREDE * 2;
  const larguraEscalada = externa * escala;
  const alturaEscalada = (ALTURA_PAREDE + MOLDURA_PAREDE * 2) * escala;

  return (
    <figure
      className="m-0 flex flex-col gap-4"
      style={
        {
          "--catalogo-w": `${larguraEscalada}px`,
          "--catalogo-h": `${alturaEscalada}px`,
          "--catalogo-scale": String(escala),
          "--catalogo-externa": `${externa}px`,
          "--catalogo-altura": `${ALTURA_PAREDE}px`,
          "--catalogo-largura": `${LARGURA_PAREDE}px`,
        } as CSSProperties
      }
    >
      <div className="flex-none h-[var(--catalogo-h)] w-[var(--catalogo-w)]">
        <div className="w-[var(--catalogo-externa)] origin-top-left scale-[var(--catalogo-scale)] rounded-[1.25rem] bg-ink p-[18px] shadow-aparelho">
          <div className="relative h-[var(--catalogo-altura)] w-[var(--catalogo-largura)] overflow-hidden rounded-[0.5rem]">
            {children}
          </div>
        </div>
      </div>

      <figcaption className="max-w-[var(--catalogo-w)]">
        <Legenda titulo={titulo} nota={nota} />
      </figcaption>
    </figure>
  );
}
