import React from "react";
import Link from "next/link";
import type { ConsoleAttentionItem } from "@albora/application";
import type { DegrauComercial, EtapaComercial, PerdaComercial } from "@albora/core";
import type { EventAdminRow } from "@albora/db";
import { Sparkline, StatusBadge } from "@albora/ui-web";

export function formatarNumero(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

/** Dado que falta é "—", nunca zero: zero é uma afirmação, ausência não. */
export function formatarPercentual(v: number | null): string {
  return v === null ? "—" : `${Math.round(v * 100)}%`;
}

export const H1_EXPLICACAO =
  "H1 = % de convidados esperados que enviaram ≥1 foto. Meta ≥40%. Mesmo cálculo em toda tela.";

export const ROTULOS_COMERCIAIS: Readonly<Record<EtapaComercial, string>> = {
  account_created: "Contas",
  event_created: "Eventos",
  qr_downloaded: "QR baixado",
  checkout_started: "Checkout",
  checkout_paid: "Pago",
};

export function FilaDeAtencao({ itens }: { itens: readonly ConsoleAttentionItem[] }) {
  const criticas = itens.filter((i) => i.severidade === "critico").length;

  return (
    <section className="mb-8 rounded-media border border-linha bg-superficie p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h2 className="tipo-den-titulo m-0">Precisa de você agora</h2>
        {itens.length > 0 && (
          <span className="tipo-den-rotulo text-ink-3">
            {criticas} crítica(s) · {itens.length} no total
          </span>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="tipo-den-corpo m-0 flex items-center gap-2 text-ink-2">
          <span aria-hidden>✓</span> Tudo em dia — sem pendências.
        </p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {itens.map((item) => (
            <li key={item.id} className="border-b border-linha last:border-b-0">
              <Link
                href={item.href}
                className="flex min-h-11 items-center gap-3 py-3 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:bg-superficie-alta"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="tipo-den-corpo text-ink">{item.titulo}</span>
                  <span className="tipo-den-rotulo text-ink-3">{item.detalhe}</span>
                </span>
                <StatusBadge tone={item.severidade === "critico" ? "critico" : "atencao"}>
                  {item.severidade === "critico" ? "crítico" : "atenção"}
                </StatusBadge>
                <span className="tipo-den-rotulo shrink-0 text-ink-3">{item.modulo}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * O tooltip é CSS puro (`group-hover`/`group-focus-within`) e o texto
 * completo fica sempre no DOM em `sr-only`: explicação de métrica que só
 * existe no hover não existe para quem navega por teclado ou leitor.
 */
export function PainelH1({
  atual,
  serie,
  janela,
}: {
  atual: number | null;
  serie: readonly { date: string; rate: number | null }[];
  janela: string;
}) {
  return (
    <section className="mb-4 flex flex-col gap-3 rounded-media border border-linha bg-superficie p-5">
      <span className="tipo-den-rotulo flex items-center gap-1.5 text-ink-3">
        Participação média (H1)
        <span className="group relative inline-flex">
          <button
            type="button"
            aria-label="Como a participação H1 é calculada"
            aria-describedby="h1-explicacao"
            className="flex h-5 w-5 cursor-help items-center justify-center rounded-full border border-linha bg-superficie-alta text-ink-3"
          >
            <span aria-hidden>i</span>
          </button>
          <span className="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-60 rounded-superficie bg-ink p-2 text-superficie group-focus-within:block group-hover:block">
            <span className="tipo-den-rotulo">{H1_EXPLICACAO}</span>
          </span>
        </span>
      </span>
      <span id="h1-explicacao" className="sr-only">
        {H1_EXPLICACAO}
      </span>

      <strong className="tipo-den-metrica text-[3.25rem] leading-none text-ink">{formatarPercentual(atual)}</strong>
      <span className="tipo-den-corpo max-w-[28ch] text-ink-2">
        dos convidados esperados enviaram pelo menos uma foto
      </span>
      <Sparkline
        label={`Participação nos últimos ${janela}`}
        points={serie.map((ponto) => ({ label: ponto.date, value: ponto.rate ?? 0 }))}
        width={300}
        height={56}
      />
    </section>
  );
}

export function FunilComercial({ degraus, perda }: { degraus: readonly DegrauComercial[]; perda: PerdaComercial | null }) {
  const base = degraus[0]?.eventos ?? 0;

  return (
    <section className="mb-8 rounded-media border border-linha bg-superficie p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h2 className="tipo-den-titulo m-0">Ativação comercial</h2>
        <span className="tipo-den-rotulo text-ink-3">Contas até pagamento</span>
      </div>

      <ol className="m-0 flex list-none flex-col gap-2 p-0">
        {degraus.map((degrau) => {
          const pior = perda?.para === degrau.etapa;
          const largura = base > 0 ? Math.round((degrau.eventos / base) * 100) : 0;
          return (
            <li key={degrau.etapa} className="flex items-center gap-3">
              <span className="tipo-den-corpo w-28 shrink-0 text-ink-2">{ROTULOS_COMERCIAIS[degrau.etapa]}</span>
              <span className="h-6 flex-1 overflow-hidden rounded-superficie bg-superficie-alta">
                <span
                  className={["flex h-full items-center px-2", pior ? "bg-critico" : "bg-ink"].join(" ")}
                  style={{ width: `${Math.max(largura, degrau.eventos > 0 ? 6 : 0)}%` }}
                >
                  <span className="tipo-den-rotulo text-superficie">{formatarNumero(degrau.eventos)}</span>
                </span>
              </span>
              <span className={["tipo-den-rotulo w-16 shrink-0 text-right", pior ? "text-critico" : "text-ink-3"].join(" ")}>
                {degrau.retencao === null ? "—" : `${Math.round((degrau.retencao - 1) * 100)}%`}
              </span>
            </li>
          );
        })}
      </ol>

      {perda && (
        <p className="tipo-den-corpo mt-3 border-t border-linha pt-3 text-critico">
          Maior perda: {ROTULOS_COMERCIAIS[perda.de]} → {ROTULOS_COMERCIAIS[perda.para]} (
          {formatarNumero(perda.sessoesPerdidas)} a menos).
        </p>
      )}
    </section>
  );
}

export function EventosAoVivo({ eventos }: { eventos: readonly EventAdminRow[] }) {
  return (
    <section className="rounded-media border border-linha bg-superficie p-5">
      <div className="mb-3 flex flex-wrap items-baseline gap-3">
        <h2 className="tipo-den-titulo m-0">Acontecendo agora</h2>
        <span className="tipo-den-rotulo text-ink-3">
          {eventos.length === 0 ? "nenhum evento ao vivo" : `${eventos.length} evento(s) ao vivo`}
        </span>
      </div>

      {eventos.length === 0 ? (
        <p className="tipo-den-corpo m-0 text-ink-3">
          Nenhuma festa dentro da janela agora. Monitoramento, não pendência — não há nada a fazer aqui.
        </p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 p-0">
          {eventos.map((evento) => (
            <li key={evento.id}>
              <Link
                href={`/console/events/${evento.id}`}
                className="flex min-h-11 flex-col gap-1 rounded-superficie border border-linha p-3 no-underline transition-colors duration-[var(--tempo)] ease-[var(--curva)] hover:bg-superficie-alta"
              >
                <span className="tipo-den-corpo truncate text-ink">{evento.title ?? "—"}</span>
                <span className="tipo-den-rotulo text-ink-3">
                  H1 {formatarPercentual(evento.h1)} · {formatarNumero(evento.totalFotos)} fotos
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
