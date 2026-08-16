"use client";

import type { CodigoDaTese, DegrauDoFunil, EtapaDaEspinha } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { GuestDisplayNames, type SessaoNoTelao } from "./guest-display-names";

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

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}/guests`);
      if (!r.ok) throw new Error("falhou");
      setResumo((await r.json()) as Resumo);
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
        <p className="m-0 text-critico">Não foi possível carregar os números.</p>
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

  return (
    <div className="flex flex-col gap-5">
      <AdminSection>
        <p className="mb-4 mt-0 leading-relaxed text-ink-2">
          Números agregados — sem enviar mensagem. O denominador vem dos convidados esperados
          que você definiu na criação.
        </p>

        <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.expectedGuests)} rotulo="esperados" />
          <Stat n={String(resumo.sessoesComUpload)} rotulo="fotografaram" />
          <Stat n={`${pct}%`} rotulo="participação" destaqueClass={destaqueClass} />
          <Stat n={String(resumo.totalFotos)} rotulo="fotos no ar" />
        </div>

        <p className={`m-0 text-sm ${destaqueClass}`}>{ROTULO_VEREDITO[resumo.veredito]}</p>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Funil da noite</h2>
        <p className="mb-4 mt-0 text-[0.8125rem] text-ink-3">
          Cada degrau conta sessões que chegaram até ali — a espinha é cumulativa, então QR e
          abrir o evento podem parecer iguais. O canal, abaixo, é quem veio da peça, do WhatsApp
          ou de um link copiado.
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
        <h2 className="mb-4 mt-0 font-titulo text-lg">Como chegaram</h2>
        <p className="mb-4 mt-0 text-[0.8125rem] text-ink-3">
          QR é só a peça impressa. WhatsApp e link copiado abrem o evento sem contar como scan.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(resumo.entradasPorVia?.qr ?? 0)} rotulo="QR impresso" />
          <Stat n={String(resumo.entradasPorVia?.wa ?? 0)} rotulo="WhatsApp" />
          <Stat n={String(resumo.entradasPorVia?.link ?? 0)} rotulo="link copiado" />
        </div>
      </AdminSection>

      <AdminSection>
        <h2 className="mb-4 mt-0 font-titulo text-lg">Antes e depois do feed</h2>
        <p className="mb-4 mt-0 text-[0.8125rem] text-ink-3">
          Fotos no ar de cada lado da primeira abertura do feed. Se o depois
          não sobe, o feed não está cumprindo o que prometeu.
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
                {/* URL assinada */}
                <img src={f.thumb} alt="" className="size-full object-cover" />
              </span>
            ))}
          </div>
        </AdminSection>
      )}
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
