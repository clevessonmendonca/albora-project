"use client";

import type { CodigoDaTese, DegrauDoFunil, EtapaDaEspinha } from "@albora/core";
import type { EntradasPorVia } from "@albora/db";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";

type MissaoInsightUI = { challengeId: string; titulo: string; emoji: string | null; fotos: number };
type HoraInsightUI = { hora: number; fotos: number };
type Insights = { missoes: MissaoInsightUI[]; horas: HoraInsightUI[] };

type Resumo = {
  expectedGuests: number;
  totalSessoes: number;
  sessoesComUpload: number;
  totalFotos: number;
  sharesTotais: number;
  participacao: number;
  veredito: CodigoDaTese;
  degraus: DegrauDoFunil[];
  uploadsAntesDoFeed: number;
  uploadsDepoisDoFeed: number;
  entradasPorVia: EntradasPorVia;
};

const INTERVALO_MS = 30_000;

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "A festa está pegando — meta de participação alcançada",
  "funil.mexe_em_friccao": "Ainda abaixo da meta — vale anunciar no microfone",
  "funil.parar": "Participação crítica — priorize o QR e o anúncio ao vivo",
};

const ROTULO_ETAPA: Record<EtapaDaEspinha, string> = {
  qr_scan: "QR escaneado",
  page_open: "Abriu o evento",
  consent: "Consentiu",
  capture: "Tirou foto",
  upload_start: "Começou envio",
  upload_ok: "Foto no ar",
};

function vereditoTextClass(veredito: CodigoDaTese): string {
  if (veredito === "funil.tese_validada") return "text-acento-texto";
  if (veredito === "funil.mexe_em_friccao") return "text-ink";
  return "text-critico";
}

/**
 * Insights do casal: só agregados. Sem nomes, sem thumbs, sem receita.
 * A moderação de nomes fica em Convidados.
 */
export function EventInsights({ eventoId }: { eventoId: string }) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [erro, setErro] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const [rGuests, rInsights] = await Promise.all([
        fetch(`/api/admin/events/${eventoId}/guests`),
        fetch(`/api/admin/events/${eventoId}/insights`),
      ]);
      if (!rGuests.ok) throw new Error("falhou");
      const data = (await rGuests.json()) as Resumo;
      setResumo(data);
      if (rInsights.ok) {
        const ins = (await rInsights.json()) as Insights;
        setInsights(ins);
      }
      setErro(false);
      setUltimaAtualizacao(new Date());
    } catch {
      setErro(true);
    }
  }, [eventoId]);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  if (erro && !resumo) {
    return (
      <AdminSection>
        <p className="m-0 text-critico">
          Não foi possível carregar os insights agora. Recarregue a página ou tente em instantes.
        </p>
      </AdminSection>
    );
  }

  if (!resumo) {
    return (
      <AdminSection>
        <p className="m-0 text-[0.9375rem] text-ink-2">Carregando insights do evento…</p>
      </AdminSection>
    );
  }

  const pct = Math.round(resumo.participacao * 100);
  const destaqueClass = vereditoTextClass(resumo.veredito);
  const ondeMorreu = resumo.degraus.find((d, i, all) => {
    const prev = all[i - 1];
    return prev && d.sessoes < prev.sessoes * 0.7;
  });

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="m-0 font-titulo text-lg">A festa está pegando?</h2>
          <div className="flex items-center gap-2">
            {ultimaAtualizacao && <TempoDesdeAtualizacao desde={ultimaAtualizacao} />}
            <button
              type="button"
              disabled={atualizando}
              onClick={() => {
                setAtualizando(true);
                void carregar().finally(() => setAtualizando(false));
              }}
              className="cursor-pointer rounded-pilula border border-linha bg-transparent px-2.5 py-1 font-titulo text-xs text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink disabled:cursor-default disabled:opacity-50"
            >
              {atualizando ? "…" : "⟳"}
            </button>
          </div>
        </div>
        <p className="mb-5 mt-0 leading-relaxed text-ink-2">
          A pergunta da noite em números ao vivo. Dados agregados, atualizados a cada 30
          segundos — sem nomes nem fotos de convidado.
        </p>
        <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={`${pct}%`} rotulo="H1 participação" destaqueClass={destaqueClass} />
          <Stat n={String(resumo.sessoesComUpload)} rotulo="fotografaram" />
          <Stat n={String(resumo.expectedGuests)} rotulo="esperados" />
          <Stat n={String(resumo.totalFotos)} rotulo="fotos no ar" />
          <Stat n={String(resumo.sharesTotais)} rotulo="compartilhamentos" />
          {insights?.horas && insights.horas.length > 0 && (() => {
            const pico = insights.horas.reduce((a, h) => (h.fotos > a.fotos ? h : a), insights.horas[0]!);
            return <Stat n={`${pico.hora}h`} rotulo="hora de pico" destaqueClass="text-ink" />;
          })()}
          {insights?.missoes && insights.missoes[0] && (
            <Stat n={String(insights.missoes[0].fotos)} rotulo={`missão: ${insights.missoes[0].titulo.slice(0, 14)}`} destaqueClass="text-ink" />
          )}
        </div>
        <p className={`m-0 text-sm font-medium ${destaqueClass}`}>
          {ROTULO_VEREDITO[resumo.veredito]}
        </p>
        {ondeMorreu && (
          <p className="mb-0 mt-3 text-sm leading-relaxed text-ink-3">
            Maior queda no funil: «{ROTULO_ETAPA[ondeMorreu.etapa]}». Vale reforçar esse
            ponto no salão ou nas instruções.
          </p>
        )}
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Jornada do convidado</h2>
        <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-3">
          Cada etapa mostra quantas pessoas chegaram até ali. A coluna de retenção compara com
          a etapa anterior.
        </p>
        <div className="flex flex-col gap-2">
          {resumo.degraus.map((d) => {
            const pctRetencao = d.retencao === null ? null : Math.round(d.retencao * 100);
            const maxSessoes = resumo.degraus[0]?.sessoes ?? 1;
            const larguraBarra = maxSessoes > 0 ? Math.round((d.sessoes / maxSessoes) * 100) : 0;
            return (
              <div key={d.etapa} className="rounded-token bg-bg px-3 py-2.5">
                <div className="mb-1.5 flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink">{ROTULO_ETAPA[d.etapa]}</span>
                  <span className="shrink-0 text-xs text-ink-3">
                    <span className="font-titulo tabular-nums text-acento-texto">{d.sessoes}</span>
                    {pctRetencao !== null && (
                      <span className="ml-1.5 text-ink-3">· {pctRetencao}%</span>
                    )}
                  </span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-superficie-alta">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${larguraBarra}%`,
                      background: larguraBarra >= 60 ? "var(--acento)" : larguraBarra >= 30 ? "var(--ink-2)" : "var(--critico)",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Canais de entrada</h2>
        <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-3">
          Como os convidados chegaram até o evento: QR impresso, mensagem no WhatsApp, link
          copiado ou código digitado.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.entradasPorVia?.qr ?? 0)} rotulo="QR impresso" />
          <Stat n={String(resumo.entradasPorVia?.wa ?? 0)} rotulo="WhatsApp" />
          <Stat n={String(resumo.entradasPorVia?.link ?? 0)} rotulo="link copiado" />
          <Stat n={String(resumo.entradasPorVia?.code ?? 0)} rotulo="código digitado" />
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Efeito do feed social</h2>
        <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-3">
          Fotos subidas antes e depois da primeira abertura do feed. Se o número depois
          não cresce, o feed pode não estar gerando o engajamento esperado.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.uploadsAntesDoFeed)} rotulo="antes do feed" />
          <Stat n={String(resumo.uploadsDepoisDoFeed)} rotulo="depois do feed" />
        </div>
      </AdminSection>

      {insights && insights.missoes.length > 0 && (
        <AdminSection>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="m-0 font-titulo text-lg">Missões mais fotografadas</h2>
            <button
              type="button"
              onClick={() => downloadInsightsCsv(insights)}
              className="cursor-pointer rounded-pilula border border-linha bg-transparent px-2.5 py-1 font-titulo text-xs text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink"
            >
              ↓ CSV
            </button>
          </div>
          <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-3">
            Ranking de engajamento por missão — sem identificar quem fotografou.
          </p>
          <MissoesRanking missoes={insights.missoes} />
        </AdminSection>
      )}

      {insights && insights.horas.length > 0 && (
        <AdminSection>
          <h2 className="mb-3 mt-0 font-titulo text-lg">Hora de ouro</h2>
          <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-3">
            Distribuição de fotos por hora da festa. O pico indica o momento de maior
            engajamento.
          </p>
          <HoraDeOuro horas={insights.horas} />
        </AdminSection>
      )}
    </div>
  );
}

function TempoDesdeAtualizacao({ desde }: { desde: Date }) {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const atualizar = () =>
      setSegundos(Math.round((Date.now() - desde.getTime()) / 1000));
    atualizar();
    const id = setInterval(atualizar, 10_000);
    return () => clearInterval(id);
  }, [desde]);

  const rotulo =
    segundos < 10 ? "agora mesmo" :
    segundos < 60 ? `há ${segundos}s` :
    `há ${Math.round(segundos / 60)}min`;

  return <span className="text-xs text-ink-3">{rotulo}</span>;
}

function Stat({
  n,
  rotulo,
  destaqueClass,
}: {
  n: string;
  rotulo: string;
  destaqueClass?: string;
}) {
  return (
    <div className="rounded-token bg-superficie-alta p-3.5">
      <p
        className={`m-0 font-titulo text-2xl font-light tabular-nums ${destaqueClass ?? "text-acento-texto"}`}
      >
        {n}
      </p>
      <p className="mb-0 mt-1.5 text-xs text-ink-2">{rotulo}</p>
    </div>
  );
}

function downloadInsightsCsv(insights: Insights): void {
  const rows: string[] = [
    "Secao,Posicao,Titulo,Hora,Fotos",
    ...insights.missoes.map((m, i) =>
      [
        "missao",
        i + 1,
        `"${(m.titulo ?? "").replace(/"/g, '""')}"`,
        "",
        m.fotos,
      ].join(","),
    ),
    ...insights.horas.map((h) =>
      ["hora", "", "", h.hora, h.fotos].join(","),
    ),
  ];
  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `insights.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function MissoesRanking({ missoes }: { missoes: MissaoInsightUI[] }) {
  const max = missoes[0]?.fotos ?? 1;
  return (
    <div className="flex flex-col gap-2">
      {missoes.map((m, i) => {
        const pct = max > 0 ? Math.round((m.fotos / max) * 100) : 0;
        return (
          <div key={m.challengeId} className="rounded-token bg-bg px-3 py-2.5">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="flex items-baseline gap-1.5 text-sm text-ink">
                <span className="w-4 shrink-0 text-xs tabular-nums text-ink-3">{i + 1}.</span>
                {m.emoji ? <span>{m.emoji}</span> : null}
                <span className="min-w-0 truncate">{m.titulo}</span>
              </span>
              <span className="shrink-0 font-titulo tabular-nums text-acento-texto">{m.fotos}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-superficie-alta">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: "var(--acento)" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function HoraDeOuro({ horas }: { horas: HoraInsightUI[] }) {
  const max = Math.max(...horas.map((h) => h.fotos), 1);
  const pico = horas.reduce((acc, h) => (h.fotos > acc.fotos ? h : acc), horas[0]!);
  return (
    <div>
      <p className="mb-3 mt-0 text-sm text-ink-2">
        Pico às <span className="font-titulo text-acento-texto">{pico.hora}h</span> com{" "}
        <span className="font-titulo text-acento-texto">{pico.fotos}</span> fotos.
      </p>
      <div className="flex items-end gap-1 overflow-x-auto pb-1" style={{ minHeight: "5rem" }}>
        {horas.map((h) => {
          const altPct = max > 0 ? Math.round((h.fotos / max) * 100) : 0;
          const isPico = h.hora === pico.hora;
          return (
            <div key={h.hora} className="flex flex-1 flex-col items-center gap-1" style={{ minWidth: "1.5rem" }}>
              <span className="text-[0.625rem] tabular-nums text-ink-3">{h.fotos}</span>
              <div
                className="w-full rounded-t-sm transition-all duration-700"
                style={{
                  height: `${Math.max(altPct, 4)}%`,
                  background: isPico ? "var(--acento)" : "var(--ink-3)",
                  maxHeight: "4rem",
                  minHeight: "3px",
                }}
              />
              <span className="text-[0.625rem] tabular-nums text-ink-3">{h.hora}h</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
