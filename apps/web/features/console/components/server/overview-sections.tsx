import React from "react";
import Link from "next/link";
import type { ConsoleAttentionItem, ConsoleAttentionSeverity } from "@albora/application";
import type { DegrauComercial, EtapaComercial, PerdaComercial } from "@albora/core";
import type { EventAdminRow } from "@albora/db";
import { Sparkline } from "@albora/ui-web";
import {
  AlertaIcon,
  AssinaturasIcon,
  CheckIcon,
  ChevronIcon,
  InfoIcon,
  LgpdIcon,
  RetencaoIcon,
  SegurancaIcon,
  SuporteIcon,
} from "./console-icons";

export function formatarNumero(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

/** Dado que falta é "—", nunca zero: zero é uma afirmação, ausência não. */
export function formatarPercentual(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export const H1_EXPLICACAO =
  "H1 = % de convidados esperados que enviaram ≥1 foto. Meta ≥40%. Mesmo cálculo em toda tela.";

/** Meta da H1 — o piso da tese (`PISO_DA_TESE` em `@albora/core`), em texto. */
export const META_H1 = 0.4;

export const ROTULOS_COMERCIAIS: Readonly<Record<EtapaComercial, string>> = {
  account_created: "Contas",
  event_created: "Eventos",
  qr_downloaded: "QR baixado",
  checkout_started: "Checkout",
  checkout_paid: "Pago",
};

const ICONE_POR_MODULO: Readonly<Record<string, (p: { size?: number }) => React.ReactElement>> = {
  Suporte: SuporteIcon,
  LGPD: LgpdIcon,
  Retenção: RetencaoIcon,
  Assinaturas: AssinaturasIcon,
  Segurança: SegurancaIcon,
};

/**
 * Cor é reforço, nunca o portador único: a severidade também aparece na
 * ordem da fila e no texto da linha. Quem não distingue as duas cores lê a
 * mesma informação.
 */
const CORES_POR_SEVERIDADE: Readonly<Record<ConsoleAttentionSeverity, { marca: string; bolha: string }>> = {
  critico: { marca: "text-critico", bolha: "bg-critico-superficie text-critico" },
  atencao: { marca: "text-atencao", bolha: "bg-atencao-superficie text-atencao" },
};

/** Faixa de painel: no v5 a hierarquia vem de borda e composição, não de sombra. */
function Painel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-media border border-linha bg-superficie ${className}`}>{children}</section>;
}

function CabecalhoDePainel({ titulo, nota }: { titulo: string; nota?: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3 border-b border-linha px-5 py-4">
      <h2 className="tipo-den-titulo m-0">{titulo}</h2>
      {nota && <span className="tipo-den-meta text-ink-3">{nota}</span>}
    </div>
  );
}

export function CabecalhoDaVisaoGeral({
  janela,
  pendencias,
  criticas,
}: {
  janela: string;
  pendencias: number;
  criticas: number;
}) {
  const limpo = pendencias === 0;
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="m-0 font-[family-name:var(--fonte-titulo)] text-[clamp(1.6rem,3vw,2.1rem)] font-normal leading-tight tracking-[-0.01em] text-ink">
          O que pede atenção agora.
        </h1>
        <p className="tipo-den-corpo m-0 max-w-[62ch] text-ink-2">
          {janela}, a fila reúne apenas o que cruzou prazo, risco ou impacto. O restante segue abaixo para
          acompanhamento.
        </p>
      </div>

      <p
        role="status"
        className={[
          "m-0 flex shrink-0 items-center gap-2.5 rounded-media border px-4 py-2.5",
          limpo ? "border-positivo-borda text-positivo" : "border-atencao-borda text-atencao",
        ].join(" ")}
      >
        {limpo ? <CheckIcon size={18} /> : <AlertaIcon size={18} />}
        <span className="flex flex-col">
          <b className="tipo-den-corpo font-medium">{limpo ? "Tudo em dia" : `${pendencias} pendência(s)`}</b>
          <span className="tipo-den-meta text-ink-3">{limpo ? "sem pendências" : `${criticas} crítica(s)`}</span>
        </span>
      </p>
    </header>
  );
}

export function FilaDeAtencao({ itens }: { itens: readonly ConsoleAttentionItem[] }) {
  const criticas = itens.filter((i) => i.severidade === "critico").length;

  return (
    <Painel className="mb-4">
      <CabecalhoDePainel
        titulo="Precisa de você agora"
        {...(itens.length > 0 ? { nota: `${criticas} crítica(s) · ${itens.length} no total` } : {})}
      />

      {itens.length === 0 ? (
        <p className="tipo-den-corpo m-0 flex items-center gap-2.5 px-5 py-6 text-ink-2">
          <span className="text-positivo">
            <CheckIcon size={18} />
          </span>
          Nada cruzou prazo, risco ou impacto nesta janela.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col px-5 py-1">
          {itens.map((item) => {
            const cor = CORES_POR_SEVERIDADE[item.severidade];
            const Icone = ICONE_POR_MODULO[item.modulo] ?? AlertaIcon;
            return (
              <li key={item.id} className="border-b border-linha last:border-b-0">
                <Link
                  href={item.href}
                  className="group flex min-h-11 items-center gap-3.5 py-3.5 no-underline"
                >
                  <span
                    aria-hidden
                    className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full ${cor.bolha}`}
                  >
                    <Icone size={16} />
                  </span>

                  <span className="flex min-w-0 flex-1 flex-col">
                    <b className="tipo-den-corpo font-medium text-ink transition-colors duration-[var(--tempo)] ease-[var(--curva)] group-hover:text-acento-texto">
                      {item.titulo}
                    </b>
                    <span className="tipo-den-meta text-ink-3">{item.detalhe}</span>
                  </span>

                  <span className={`shrink-0 tipo-den-meta font-medium ${cor.marca}`}>
                    {item.severidade === "critico" ? "crítico" : "atenção"}
                  </span>
                  <span className="hidden shrink-0 font-[family-name:var(--fonte-titulo)] text-[0.7rem] uppercase tracking-[0.12em] text-ink-3 sm:inline">
                    {item.modulo}
                  </span>
                  <span aria-hidden className="shrink-0 text-ink-3">
                    <ChevronIcon size={16} />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}

export function PainelH1({
  atual,
  serie,
}: {
  atual: number | null;
  serie: readonly { date: string; rate: number | null }[];
}) {
  const acimaDaMeta = atual !== null && atual >= META_H1;

  return (
    <Painel className="flex flex-col p-5">
      <span className="tipo-den-meta flex items-center gap-1.5 font-medium text-ink-2">
        Participação média (H1)
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-label="Como a participação H1 é calculada"
            aria-describedby="h1-explicacao"
            className="flex cursor-help items-center justify-center rounded-full text-ink-3 transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:text-ink"
          >
            <InfoIcon size={15} />
          </button>
          <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-60 rounded-superficie bg-ink p-2.5 group-focus-within:block group-hover:block">
            <span className="tipo-den-meta text-superficie">{H1_EXPLICACAO}</span>
          </span>
        </span>
      </span>

      <strong className="my-3 block font-[family-name:var(--fonte-corpo)] text-[clamp(3rem,7vw,4.6rem)] font-medium leading-none tracking-[-0.07em] tabular-nums text-ink">
        {formatarPercentual(atual)}
      </strong>
      <span className="tipo-den-corpo max-w-[24ch] text-ink-2">
        dos convidados esperados enviaram pelo menos uma foto
      </span>

      <span id="h1-explicacao" className="sr-only">
        {H1_EXPLICACAO}
      </span>

      <div className="mt-auto pt-6">
        <Sparkline
          className="block h-16 w-full"
          label="Evolução da participação no período"
          points={serie.map((ponto) => ({ label: ponto.date, value: ponto.rate ?? 0 }))}
          width={300}
          height={64}
        />
      </div>

      <div className="mt-3 flex justify-between gap-4 border-t border-linha pt-3">
        <span className="tipo-den-meta text-ink-3">Meta {Math.round(META_H1 * 100)}%</span>
        <b className={`tipo-den-meta font-medium ${atual === null ? "text-ink-3" : acimaDaMeta ? "text-positivo" : "text-atencao"}`}>
          {atual === null ? "sem base para comparar" : acimaDaMeta ? "Acima da meta" : "Abaixo da meta"}
        </b>
      </div>
    </Painel>
  );
}

export type Metrica = { rotulo: string; valor: string; nota?: string };

/**
 * Faixa, não grade de cartões: quatro números que se leem juntos separados
 * por divisória, como no v5. Cartão para cada um criaria card-dentro-de-card
 * com o painel que já os contém.
 */
export function FaixaDeMetricas({ metricas }: { metricas: readonly Metrica[] }) {
  return (
    <Painel className="mb-4 px-5 py-4">
      <dl className="m-0 grid grid-cols-2 gap-y-4 lg:grid-cols-4 lg:gap-y-0">
        {metricas.map((m, i) => (
          <div
            key={m.rotulo}
            className={["flex flex-col gap-1 px-4", i === 0 ? "lg:pl-0" : "lg:border-l lg:border-linha"].join(" ")}
          >
            <dt className="m-0 font-[family-name:var(--fonte-titulo)] text-[0.7rem] uppercase tracking-[0.14em] text-ink-3">
              {m.rotulo}
            </dt>
            <dd className="tipo-den-metrica m-0 text-[1.6rem] font-medium text-ink">{m.valor}</dd>
            {m.nota && <span className="tipo-den-meta text-ink-3">{m.nota}</span>}
          </div>
        ))}
      </dl>
    </Painel>
  );
}

export function FunilComercial({
  degraus,
  perda,
}: {
  degraus: readonly DegrauComercial[];
  perda: PerdaComercial | null;
}) {
  const base = degraus[0]?.eventos ?? 0;

  return (
    <Painel className="mb-4">
      <CabecalhoDePainel titulo="Ativação comercial" nota="Contas até pagamento" />

      <div className="px-5 py-4">
        <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
          {degraus.map((degrau) => {
            const pior = perda?.para === degrau.etapa;
            const largura = base > 0 ? (degrau.eventos / base) * 100 : 0;
            return (
              <li key={degrau.etapa} className="flex items-center gap-3">
                <span className="tipo-den-corpo w-[7.5rem] shrink-0 text-ink-2">{ROTULOS_COMERCIAIS[degrau.etapa]}</span>
                <span className="h-6 flex-1 overflow-hidden rounded-[5px] bg-superficie-alta">
                  <span
                    className={`flex h-full items-center rounded-[5px] px-2 ${pior ? "bg-critico" : "bg-ink"}`}
                    style={{ width: `${Math.max(largura, degrau.eventos > 0 ? 8 : 0)}%` }}
                  >
                    <span className="tipo-den-meta font-medium tabular-nums text-superficie">
                      {formatarNumero(degrau.eventos)}
                    </span>
                  </span>
                </span>
                <span
                  className={`w-[4.6rem] shrink-0 text-right tipo-den-meta font-medium tabular-nums ${pior ? "text-critico" : "text-ink-3"}`}
                >
                  {degrau.retencao === null ? "—" : `${Math.round((degrau.retencao - 1) * 100)}%`}
                </span>
              </li>
            );
          })}
        </ol>

        {perda && (
          <p className="mt-4 flex items-center gap-2 border-t border-linha pt-3 tipo-den-meta text-critico">
            <AlertaIcon size={14} />
            Maior perda: <b>{ROTULOS_COMERCIAIS[perda.de]} → {ROTULOS_COMERCIAIS[perda.para]}</b> (
            {formatarNumero(perda.sessoesPerdidas)} contas a menos).
          </p>
        )}
      </div>
    </Painel>
  );
}

export function EventosAoVivo({ eventos }: { eventos: readonly EventAdminRow[] }) {
  return (
    <Painel className="overflow-hidden">
      <CabecalhoDePainel
        titulo="Acontecendo agora"
        nota={eventos.length === 0 ? "nenhum evento ao vivo" : `${eventos.length} evento(s) ao vivo`}
      />

      {eventos.length === 0 ? (
        <p className="tipo-den-corpo m-0 px-5 py-6 text-ink-3">
          Nenhuma festa dentro da janela agora. Isto é monitoramento, não pendência — não há nada a fazer aqui.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] p-0">
          {eventos.map((evento) => (
            <li key={evento.id} className="border-l border-linha first:border-l-0">
              <Link
                href={`/console/events/${evento.id}`}
                className="flex min-h-11 flex-col gap-1 px-4 py-4 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:bg-superficie-alta"
              >
                <span className="tipo-den-corpo truncate font-medium text-ink">{evento.title ?? "—"}</span>
                <span className="tipo-den-meta flex items-center gap-1.5 font-medium text-positivo">
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 rounded-full bg-positivo shadow-[0_0_0_3px_var(--color-positivo-superficie)]"
                  />
                  ao vivo
                </span>
                <span className="tipo-den-meta tabular-nums text-ink-3">
                  H1 {formatarPercentual(evento.h1)} · {formatarNumero(evento.totalFotos)} fotos
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}
