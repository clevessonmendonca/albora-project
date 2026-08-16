"use client";

import type { CodigoDaTese, DegrauDoFunil, EtapaDaEspinha } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";

type Resumo = {
  expectedGuests: number;
  totalSessoes: number;
  sessoesComUpload: number;
  totalFotos: number;
  participacao: number;
  veredito: CodigoDaTese;
  degraus: DegrauDoFunil[];
  uploadsAntesDoFeed: number;
  uploadsDepoisDoFeed: number;
  entradasPorVia: { qr: number; wa: number; link: number };
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
        <p className="m-0 text-critico">Não foi possível carregar os insights.</p>
      </AdminSection>
    );
  }

  if (!resumo) {
    return (
      <AdminSection>
        <p className="m-0 text-ink-2">Carregando…</p>
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
        <p className="mb-4 mt-0 leading-relaxed text-ink-2">
          A pergunta da noite: a festa está pegando? Só números agregados — sem nomes nem
          fotos de convidado.
        </p>
        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={`${pct}%`} rotulo="H1 participação" destaqueClass={destaqueClass} />
          <Stat n={String(resumo.sessoesComUpload)} rotulo="fotografaram" />
          <Stat n={String(resumo.expectedGuests)} rotulo="esperados" />
          <Stat n={String(resumo.totalFotos)} rotulo="fotos no ar" />
        </div>
        <p className={`m-0 text-sm ${destaqueClass}`}>{ROTULO_VEREDITO[resumo.veredito]}</p>
        {ondeMorreu && (
          <p className="mb-0 mt-3 text-sm text-ink-3">
            Maior queda no funil em «{ROTULO_ETAPA[ondeMorreu.etapa]}» — é o degrau para
            reforçar no salão.
          </p>
        )}
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Funil</h2>
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
        <h2 className="mb-4 mt-0 font-titulo text-lg">Como chegaram</h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.entradasPorVia?.qr ?? 0)} rotulo="QR impresso" />
          <Stat n={String(resumo.entradasPorVia?.wa ?? 0)} rotulo="WhatsApp" />
          <Stat n={String(resumo.entradasPorVia?.link ?? 0)} rotulo="link copiado" />
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Antes e depois do feed</h2>
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
