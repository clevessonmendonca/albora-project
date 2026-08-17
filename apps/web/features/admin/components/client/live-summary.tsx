"use client";

import type { CodigoDaTese } from "@albora/core";
import { useCallback, useEffect, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";

type Resumo = {
  expectedGuests: number;
  sessoesComUpload: number;
  totalFotos: number;
  filaRevisao: number;
  participacao: number;
  veredito: CodigoDaTese;
  ultimas: { id: string; thumb: string; criadaEm: string }[];
};

const INTERVALO_MS = 30_000;

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "Participação na meta (≥40%)",
  "funil.mexe_em_friccao": "Abaixo da meta — vale olhar fricção",
  "funil.parar": "Participação crítica — investigar antes de escalar",
};

function vereditoTextClass(veredito: CodigoDaTese): string {
  if (veredito === "funil.tese_validada") return "text-acento-texto";
  if (veredito === "funil.mexe_em_friccao") return "text-ink";
  return "text-critico";
}

type Props = {
  eventoId: string;
};

export function LiveSummary({ eventoId }: Props) {
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}`);
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
        <p className="m-0 text-critico">Não foi possível carregar o painel agora. Tente recarregar a página.</p>
      </AdminSection>
    );
  }

  if (!resumo) {
    return (
      <AdminSection>
        <p className="m-0 text-ink-2">Carregando painel…</p>
      </AdminSection>
    );
  }

  const pct = Math.round(resumo.participacao * 100);
  const destaqueClass = vereditoTextClass(resumo.veredito);

  return (
    <AdminSection>
      <div className="mb-4 flex items-center justify-between gap-4">
        <p className="m-0 font-titulo text-lg">Ao vivo</p>
        <span className="inline-flex items-center gap-1.5 rounded-pilula bg-acento px-2.5 py-1 font-titulo text-xs text-sobre-acento">
          <span className="size-[0.4rem] rounded-full bg-current" />
          festa
        </span>
      </div>

      <div className="mb-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
        <Stat n={`${pct}%`} rotulo="participação" destaqueClass={destaqueClass} />
        <Stat
          n={`${resumo.sessoesComUpload}/${resumo.expectedGuests}`}
          rotulo="convidados com foto"
        />
        <Stat n={String(resumo.totalFotos)} rotulo="fotos enviadas" />
        <Stat n={String(resumo.filaRevisao)} rotulo="na fila de revisão" />
      </div>

      <p className={`mb-4 mt-0 text-sm ${destaqueClass}`}>{ROTULO_VEREDITO[resumo.veredito]}</p>

      {resumo.ultimas.length > 0 && (
        <>
          <p className="mb-2 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
            Chegando agora
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {resumo.ultimas.map((f) => (
              <span
                key={f.id}
                className="relative aspect-[3/4] overflow-hidden rounded-token bg-superficie-alta"
              >
                {/* URL assinada */}
                <img src={f.thumb} alt="" className="size-full object-cover" />
              </span>
            ))}
          </div>
        </>
      )}
    </AdminSection>
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
