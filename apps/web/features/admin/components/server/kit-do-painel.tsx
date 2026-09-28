import React, { type ReactNode } from "react";
import { cva } from "@albora/ui-web";

/**
 * Os primitivos do painel, na geometria do protótipo: raio de 9/17px, botão de
 * 13px/700, faixa de destaque escura. Os botões do `@albora/ui-web` são pílula —
 * são do convidado, e o painel não é o convidado. Cor e fonte continuam saindo
 * de token; nada aqui fixa hex.
 */
export const botaoDoPainel = cva({
  base: "inline-flex min-h-10 cursor-pointer items-center justify-center gap-[9px] whitespace-nowrap rounded-[9px] border-0 px-4 py-[11px] text-[13px] font-bold no-underline transition-[transform,background,box-shadow] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-55",
  variants: {
    variant: {
      /** O sólido escuro do protótipo. */
      primary: "bg-ink text-bg shadow-suave",
      light: "border border-linha bg-superficie text-ink hover:bg-superficie-alta",
      gold: "bg-acento text-sobre-acento shadow-suave",
      ghost: "bg-transparent px-2 text-acento-texto",
      /** Sobre foto: contorno claro, sem desfocar o fundo (glassmorphism é anti-padrão). */
      outline: "border border-linha bg-superficie-alta text-ink",
    },
    width: { auto: "", full: "w-full" },
  },
  defaultVariants: { variant: "primary", width: "auto" },
});

/** Cabeçalho de tela: eyebrow + título + subtítulo, com a ação à direita. */
export function IntroDaPagina({
  eyebrow,
  titulo,
  subtitulo,
  acao,
}: {
  eyebrow: string;
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
          {eyebrow}
        </div>
        <h1 className="m-0 font-[family-name:var(--fonte-titulo)] text-[clamp(1.75rem,4vw,2.5rem)] leading-[1.1] tracking-[var(--tracking-titulo)] text-ink">
          {titulo}
        </h1>
        {subtitulo && <p className="m-0 mt-2 max-w-[52ch] text-sm text-ink-2">{subtitulo}</p>}
      </div>
      {acao && <div className="flex shrink-0 gap-2 max-md:w-full [&>*]:max-md:w-full">{acao}</div>}
    </div>
  );
}

/** A faixa escura de destaque que abre as telas de seção. */
export function FaixaDeDestaque({
  eyebrow,
  titulo,
  descricao,
  acao,
}: {
  eyebrow: string;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-5 rounded-[17px] bg-gradient-chao-quente p-6 text-ink">
      <div className="min-w-0">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
          {eyebrow}
        </div>
        <h2 className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.5rem] leading-tight tracking-[var(--tracking-titulo)]">
          {titulo}
        </h2>
        <p className="m-0 mt-2 max-w-[56ch] text-sm text-ink-2">{descricao}</p>
      </div>
      {acao && <div className="shrink-0">{acao}</div>}
    </div>
  );
}

export function Cartao({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={[
        "rounded-[17px] border border-linha bg-superficie p-[25px] shadow-suave",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </section>
  );
}

/** Cabeçalho dentro de um cartão: título + subtítulo à esquerda, ação textual à direita. */
export function CabecalhoDeCartao({
  titulo,
  subtitulo,
  acao,
}: {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.125rem] text-ink">
          {titulo}
        </h3>
        {subtitulo && <p className="m-0 mt-1 text-[13px] text-ink-3">{subtitulo}</p>}
      </div>
      {acao}
    </div>
  );
}

export const acaoTextual =
  "cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-acento-texto no-underline hover:opacity-80";

/** Painel de número: ícone, valor grande e legenda. */
export function Estatistica({
  icone,
  valor,
  legenda,
  selo,
}: {
  icone: ReactNode;
  valor: string;
  legenda: string;
  selo?: string;
}) {
  return (
    <div className="relative rounded-[17px] border border-linha bg-superficie p-[25px] shadow-suave">
      <div className="mb-3 grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-acento-fundo text-acento-texto">
        {icone}
      </div>
      <b className="block font-[family-name:var(--fonte-titulo)] text-[1.75rem] leading-none text-ink">
        {valor}
      </b>
      <span className="mt-1 block text-[13px] text-ink-3">{legenda}</span>
      {selo && (
        <small className="absolute right-4 top-4 rounded-pilula bg-acento-fundo px-2 py-1 text-[10px] text-acento-texto">
          {selo}
        </small>
      )}
    </div>
  );
}

export function Estatisticas({ children }: { children: ReactNode }) {
  return <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

export const etiquetaVariantes = cva({
  base: "inline-flex items-center rounded-pilula px-3 py-1 text-[11px] font-semibold",
  variants: {
    tom: {
      neutro: "bg-superficie-alta text-ink-2",
      /** O protótipo usa verde para "confirmada/aprovada"; a paleta da marca não tem verde, e inventar um hex aqui quebraria o guard de tokens. */
      positivo: "bg-acento-fundo text-acento-texto",
      atencao: "border border-acento-borda bg-transparent text-acento-texto",
      critico: "bg-critico-superficie text-critico",
    },
  },
  defaultVariants: { tom: "neutro" },
});

export function Etiqueta({
  tom,
  children,
}: {
  tom?: "neutro" | "positivo" | "atencao" | "critico";
  children: ReactNode;
}) {
  return <span className={etiquetaVariantes({ tom })}>{children}</span>;
}

/** Nota de vazio curta, dentro de um cartão. */
export function NotaVazia({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl bg-acento-fundo px-4 py-3 text-[13px] text-ink-2">{children}</div>
  );
}

/** Vazio grande, com ícone — o do feed da Comunidade. */
export function VazioIlustrado({
  icone,
  titulo,
  descricao,
}: {
  icone: ReactNode;
  titulo: string;
  descricao: string;
}) {
  return (
    <div className="grid place-items-center gap-2 rounded-[17px] border border-dashed border-linha px-6 py-12 text-center">
      <span className="text-ink-3">{icone}</span>
      <h3 className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.125rem] text-ink">
        {titulo}
      </h3>
      <p className="m-0 max-w-[40ch] text-[13px] text-ink-3">{descricao}</p>
    </div>
  );
}

/** Faixa de rodapé de seção: um recado e uma ação. */
export function Aviso({
  titulo,
  descricao,
  acao,
}: {
  titulo: string;
  descricao: string;
  acao?: ReactNode;
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-acento-fundo p-5">
      <span className="min-w-0">
        <strong className="block text-sm text-ink">{titulo}</strong>
        <small className="block text-[13px] text-ink-3">{descricao}</small>
      </span>
      {acao}
    </div>
  );
}

/** O grid de duas colunas das telas de seção: conteúdo largo + coluna de apoio. */
export function GradeDePaineis({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">{children}</div>;
}

export function ColunaDeApoio({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-5">{children}</div>;
}

/** Trilho de progresso do checklist. */
export function Progresso({ feitos, total }: { feitos: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((feitos / total) * 100);

  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between text-[13px] text-ink-3">
        <span>
          {feitos} de {total} prontos
        </span>
        <b className="text-acento-texto">{pct}%</b>
      </div>
      <div className="h-[7px] overflow-hidden rounded-pilula bg-superficie-alta">
        <span
          className="block h-full rounded-pilula bg-acento transition-[width] duration-[var(--tempo)] ease-[var(--curva)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
