"use client";

import type { CodigoDaTese, DegrauDoFunil, EtapaDaEspinha } from "@albora/core";
import type { EntradasPorVia } from "@albora/db";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { GuestDisplayNames, type SessaoNoTelao } from "./guest-display-names";

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
  ultimas: { id: string; thumb: string; criadaEm: string }[];
  sessoes?: SessaoNoTelao[];
};

const INTERVALO_MS = 30_000;

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "Participação na meta (≥40%)",
  "funil.mexe_em_friccao": "Abaixo da meta — vale olhar fricção",
  "funil.parar": "Participação crítica — investigar antes de escalar",
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

type Props = {
  eventoId: string;
};

export function GuestFunnel({ eventoId }: Props) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/guests`);
      if (!r.ok) throw new Error("falhou");
      setResumo((await r.json()) as Resumo);
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
          Não foi possível carregar os números agora. Recarregue a página ou tente em instantes.
        </p>
      </AdminSection>
    );
  }

  if (!resumo) {
    return (
      <AdminSection>
        <div className="animate-pulse">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="h-6 w-48 rounded-token bg-superficie-alta" />
            <div className="h-6 w-20 rounded-pilula bg-superficie-alta" />
          </div>
          <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[4.5rem] rounded-token bg-superficie-alta" />
            ))}
          </div>
          <div className="h-3.5 w-56 rounded-full bg-superficie-alta" />
        </div>
      </AdminSection>
    );
  }

  const pct = Math.round(resumo.participacao * 100);
  const destaqueClass = vereditoTextClass(resumo.veredito);

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="m-0 font-titulo text-lg">Participação ao vivo</h2>
          <div className="flex items-center gap-2">
            {ultimaAtualizacao && (
              <TempoDesdeAtualizacao desde={ultimaAtualizacao} />
            )}
            <button
              type="button"
              disabled={atualizando}
              onClick={() => {
                setAtualizando(true);
                void carregar().finally(() => setAtualizando(false));
              }}
              className="cursor-pointer rounded-pilula border border-linha bg-transparent p-1.5 text-ink-3 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:border-acento-texto hover:text-ink disabled:cursor-default disabled:opacity-50"
              aria-label="Atualizar agora"
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden className={atualizando ? "opacity-50" : ""}>
                <path d="M11 6.5A4.5 4.5 0 0 1 2 6.5M11 6.5V3.5M11 6.5H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <p className="mb-4 mt-0 leading-relaxed text-ink-2">
          Números agregados, atualizados a cada 30 segundos. O denominador vem dos convidados
          esperados que você definiu na criação do evento.
        </p>

        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.expectedGuests)} rotulo="esperados" />
          <Stat n={String(resumo.sessoesComUpload)} rotulo="fotografaram" />
          <Stat n={`${pct}%`} rotulo="participação" destaqueClass={destaqueClass} />
          <Stat n={String(resumo.totalFotos)} rotulo="fotos no ar" />
          <Stat n={String(resumo.sharesTotais)} rotulo="compartilhamentos" />
        </div>

        <p className={`m-0 text-sm ${destaqueClass}`}>{ROTULO_VEREDITO[resumo.veredito]}</p>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-3 mt-0 font-titulo text-lg">Onde os convidados param</h2>
        <p className="mb-4 mt-0 text-[0.8125rem] leading-relaxed text-ink-3">
          Cada degrau mostra quantas pessoas chegaram até ali. A espinha é cumulativa, então
          QR escaneado e Abriu o evento podem ter números parecidos. Se houver queda brusca
          em algum ponto, vale investigar fricção.
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
          QR é só a peça impressa. WhatsApp, link copiado e código digitado abrem o evento
          direto, sem passar pelo scan da câmera.
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
          Fotos subidas antes e depois da primeira abertura do feed. Se o número depois não
          cresce, o feed não está gerando o engajamento esperado.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.uploadsAntesDoFeed)} rotulo="antes do feed" />
          <Stat n={String(resumo.uploadsDepoisDoFeed)} rotulo="depois do feed" />
        </div>
      </AdminSection>

      <GuestDisplayNames
        eventoId={eventoId}
        sessoes={resumo.sessoes ?? []}
        onChanged={() => void carregar()}
      />

      {resumo.ultimas.length > 0 && (
        <AdminSection>
          <p className="mb-3 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
            Chegando agora
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {resumo.ultimas.map((f) => (
              <span
                key={f.id}
                className="aspect-[3/4] overflow-hidden rounded-token bg-superficie-alta"
              >
                <img src={f.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
              </span>
            ))}
          </div>
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

  return (
    <span className="text-xs text-ink-3">{rotulo}</span>
  );
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
