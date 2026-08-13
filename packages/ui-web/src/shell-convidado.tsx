"use client";

import type { ReactNode } from "react";
import { iniciais, Avatar } from "./Avatar";
import { BarraDeStatus } from "./BarraDeStatus";
import { Botao } from "./Botao";
import { cn } from "./variantes";

/** Espaço reservado acima da barra de abas fixa nas rotas do convidado. */
export const RODAPE_ABAS = "calc(6.5rem + env(safe-area-inset-bottom))";
export const PADDING_LATERAL = "1.125rem";

export const iniciaisDoAutor = iniciais;

export function ChaoConvidado({
  children,
  semStatus,
}: {
  children: ReactNode;
  semStatus?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg font-corpo text-ink leading-normal">
      {!semStatus && <BarraDeStatus />}
      {children}
    </div>
  );
}

export function MioloConvidado({
  children,
  comAbas = true,
}: {
  children: ReactNode;
  comAbas?: boolean;
}) {
  return (
    <div
      className="flex flex-1 flex-col px-[1.125rem]"
      style={{ paddingBottom: comAbas ? RODAPE_ABAS : "1.5rem" }}
    >
      {children}
    </div>
  );
}

export function CabecalhoConvidado({
  titulo,
  hrefInicio,
  acao,
}: {
  titulo: string;
  hrefInicio?: string;
  acao?: ReactNode;
}) {
  const tituloClass =
    "font-titulo text-[1.125rem] tracking-titulo text-inherit no-underline";

  return (
    <div className="flex items-center justify-between gap-3 pb-3.5 pt-1.5">
      {hrefInicio ? (
        <a href={hrefInicio} className={tituloClass}>
          {titulo}
        </a>
      ) : (
        <span className={tituloClass}>{titulo}</span>
      )}
      {acao}
    </div>
  );
}

export function RotuloEvento({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-acento">
      {children}
    </p>
  );
}

export function TituloGrande({ children }: { children: ReactNode }) {
  return (
    <h1 className="mt-3.5 font-titulo text-[clamp(1.75rem,8vw,2rem)] font-light leading-[1.1] tracking-titulo [text-wrap:balance]">
      {children}
    </h1>
  );
}

export function TextoSecundario({ children }: { children: ReactNode }) {
  return <p className="mt-3.5 text-[0.9375rem] text-ink-2">{children}</p>;
}

export function EstadoVazio({
  titulo,
  lede,
  caminhoDaCamera,
  rotuloCamera = "Tirar foto",
}: {
  titulo: string;
  lede: string;
  caminhoDaCamera: string;
  rotuloCamera?: string;
}) {
  return (
    <div className="grid gap-5 py-[calc(var(--espaco)*8)] text-center">
      <div>
        <p className="mb-1.5 font-titulo text-[1.6rem] font-medium leading-snug tracking-titulo [text-wrap:balance]">
          {titulo}
        </p>
        <p className="m-0 leading-relaxed text-ink-2">{lede}</p>
      </div>
      <a
        href={caminhoDaCamera}
        className="grid w-full place-items-center rounded-pilula bg-acento px-[1.125rem] py-[1.125rem] font-semibold text-sobre-acento no-underline"
      >
        {rotuloCamera}
      </a>
    </div>
  );
}

export function SheetBaixo({
  titulo,
  aberto,
  onFechar,
  children,
  rodape,
  idTitulo,
}: {
  titulo: string;
  aberto: boolean;
  onFechar: () => void;
  children: ReactNode;
  rodape?: ReactNode;
  idTitulo?: string;
}) {
  if (!aberto) return null;

  const tituloId = idTitulo ?? "sheet-titulo";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={tituloId}
      className="fixed inset-0 z-[35] grid place-items-end bg-bg-overlay p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
      onClick={onFechar}
    >
      <div
        className="grid max-h-[min(78dvh,32rem)] w-[min(26rem,100%)] grid-rows-[auto_1fr_auto] gap-3.5 overflow-hidden rounded-superficie border border-linha bg-superficie p-5"
        onClick={(ev) => ev.stopPropagation()}
      >
        <h2 id={tituloId} className="m-0 font-titulo text-[1.0625rem] font-normal">
          {titulo}
        </h2>
        <div className="min-h-0 overflow-auto">{children}</div>
        {rodape}
      </div>
    </div>
  );
}

export function AvisoGate({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-start gap-3 rounded-token bg-superficie px-4 py-3.5">
      <span className="pulso mt-1.5 size-[0.4375rem] shrink-0 rounded-full bg-acento" />
      <span className="text-[0.8125rem] leading-snug text-ink-2">{children}</span>
    </div>
  );
}

export function FaixaMissao({
  indice,
  total,
  titulo,
}: {
  indice: number;
  total: number;
  titulo: string;
}) {
  return (
    <div className="rounded-token bg-[color-mix(in_srgb,var(--acento)_92%,transparent)] px-4 py-3.5 text-sobre-acento">
      <p className="m-0 text-[0.5625rem] uppercase tracking-rotulo opacity-75">
        Missão {String(indice).padStart(2, "0")} de {String(total).padStart(2, "0")}
      </p>
      <p className="mt-1 font-titulo text-[1.0625rem] leading-tight">{titulo}</p>
    </div>
  );
}

export function AvatarAutor({ nome }: { nome: string }) {
  return <Avatar nome={nome} className="size-[1.875rem] text-[0.75rem]" />;
}

export function CabecalhoPublicacao({
  autor,
  meta,
}: {
  autor: string;
  meta?: string | null;
}) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <AvatarAutor nome={autor} />
      <span className="flex-1 text-[0.84375rem]">{autor}</span>
      {meta && <span className="text-[0.6875rem] text-ink-3">{meta}</span>}
    </div>
  );
}

export function BotaoPrimario({
  children,
  onClick,
  desabilitado,
  tipo = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  desabilitado?: boolean;
  tipo?: "button" | "submit";
}) {
  return (
    <Botao
      type={tipo}
      variante="primario"
      tamanho="g"
      largura="cheia"
      disabled={desabilitado}
      onClick={onClick}
    >
      {children}
    </Botao>
  );
}

export function BotaoSecundario({
  children,
  onClick,
  desabilitado,
  tipo = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  desabilitado?: boolean;
  tipo?: "button" | "submit";
}) {
  return (
    <Botao
      type={tipo}
      variante="secundario"
      tamanho="md"
      largura="cheia"
      className="py-[0.9375rem] font-normal"
      disabled={desabilitado}
      onClick={onClick}
    >
      {children}
    </Botao>
  );
}

export function CampoNome({
  valor,
  onChange,
  placeholder,
}: {
  valor: string;
  onChange: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <input
      value={valor}
      onChange={(ev) => onChange(ev.target.value)}
      placeholder={placeholder}
      maxLength={40}
      required
      autoComplete="given-name"
      enterKeyHint="go"
      className="w-full rounded-token border-0 border-b-2 border-b-acento bg-superficie px-[1.125rem] py-[1.0625rem] font-titulo text-[1.375rem] text-ink outline-none"
    />
  );
}

export function Consentimento({
  marcado,
  onChange,
  children,
}: {
  marcado: boolean;
  onChange?: (valor: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex items-start gap-3",
        onChange ? "cursor-pointer" : "cursor-default",
      )}
    >
      <input
        type="checkbox"
        checked={marcado}
        readOnly={!onChange}
        onChange={onChange ? (ev) => onChange(ev.target.checked) : undefined}
        className="pointer-events-none absolute size-px opacity-0"
      />
      <span
        className={cn(
          "grid size-[1.375rem] shrink-0 place-items-center rounded-[0.4375rem] border text-[0.8125rem]",
          marcado
            ? "border-acento bg-acento text-sobre-acento"
            : "border-linha bg-transparent text-transparent",
        )}
      >
        {marcado ? "✓" : ""}
      </span>
      <span className="text-[0.8125rem] leading-normal text-ink-2">{children}</span>
    </label>
  );
}

export function ColunaEntrada({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-7 px-7 pb-12">
      {children}
    </div>
  );
}

export function LinkDiscreto({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  const className =
    "border-0 bg-transparent p-0 font-[inherit] text-[inherit] leading-[inherit] text-acento underline underline-offset-[0.15em]";

  if (!onClick) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type="button"
      onClick={(ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        onClick();
      }}
      className={cn(className, "cursor-pointer")}
    >
      {children}
    </button>
  );
}

export function RecadoConsentimento({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 rounded-token bg-superficie px-4 py-3.5 text-[0.8125rem] leading-snug text-ink-2">
      {children}
    </p>
  );
}

export function RecadoErro({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="mt-3 text-[0.85rem] text-critico">
      {children}
    </p>
  );
}

export function RodapeDiscreto({ children }: { children: ReactNode }) {
  return <p className="m-0 text-center text-xs text-ink-3">{children}</p>;
}
