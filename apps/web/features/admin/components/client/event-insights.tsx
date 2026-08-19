"use client";

import type { CodigoDaTese, DegrauDoFunil, EtapaDaEspinha } from "@albora/core";
import type { EntradasPorVia } from "@albora/db";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";

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
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/guests`);
      if (!r.ok) throw new Error("falhou");
      const data = (await r.json()) as Resumo;
      setResumo(data);
      setErro(false);
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
        <h2 className="mb-3 mt-0 font-titulo text-lg">A festa está pegando?</h2>
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
          {resumo.degraus.map((d) => (
            <div
              key={d.etapa}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-token bg-bg px-3 py-[0.65rem] text-sm"
            >
              <span className="text-ink">{ROTULO_ETAPA[d.etapa]}</span>
              <span className="font-titulo tabular-nums text-acento-texto">{d.sessoes}</span>
              <span className="min-w-12 text-right text-xs text-ink-3">
                {d.retencao === null ? "—" : `${Math.round(d.retencao * 100)}%`}
              </span>
            </div>
          ))}
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
    </div>
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
