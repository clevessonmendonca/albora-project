"use client";

import type { CodigoDaTese } from "@albora/core";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminSection } from "@/features/admin/components/server/admin-shell";
import { useModerationCount } from "./moderation-count-context";
import { AtualizadoHa, RefreshButton } from "./refresh-control";

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
  const [primeiraFotoToast, setPrimeiraFotoToast] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const primeiraFotoVista = useRef(false);
  const { setCount } = useModerationCount();

  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}`);
      if (!r.ok) throw new Error("falhou");
      const dados = (await r.json()) as Resumo;
      setResumo(dados);
      setErro(false);
      setUltimaAtualizacao(new Date());
      setCount(dados.filaRevisao);

      if (!primeiraFotoVista.current && dados.totalFotos > 0) {
        const chave = `albora:primeiraFoto:${eventoId}`;
        try {
          if (!sessionStorage.getItem(chave)) {
            sessionStorage.setItem(chave, "1");
            setPrimeiraFotoToast(true);
          }
        } catch {
          // sessionStorage blocked (private mode or permission denied)
        }
        primeiraFotoVista.current = true;
      }
    } catch {
      setErro(true);
    }
  }, [eventoId, setCount]);

  useEffect(() => {
    void carregar();
    const id = window.setInterval(() => void carregar(), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [carregar]);

  useEffect(() => {
    if (!primeiraFotoToast) return;
    const id = setTimeout(() => setPrimeiraFotoToast(false), 7000);
    return () => clearTimeout(id);
  }, [primeiraFotoToast]);

  if (erro && !resumo) {
    return (
      <AdminSection>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-critico">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M8 3L14 13H2L8 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M8 7v2.5M8 11.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <div>
            <p className="m-0 text-[0.9375rem] text-ink">Painel indisponível agora.</p>
            <p className="m-0 mt-1 text-[0.875rem] text-ink-3">
              Recarregue a página para tentar de novo.
            </p>
          </div>
        </div>
      </AdminSection>
    );
  }

  if (!resumo) {
    return (
      <AdminSection>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="h-6 w-16 animate-pulse rounded-token bg-superficie-alta" />
          <div className="h-6 w-20 animate-pulse rounded-pilula bg-superficie-alta" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[4.5rem] animate-pulse rounded-token bg-superficie-alta" />
          ))}
        </div>
        <div className="h-1.5 animate-pulse rounded-full bg-superficie-alta" />
      </AdminSection>
    );
  }

  const pct = Math.round(resumo.participacao * 100);
  const destaqueClass = vereditoTextClass(resumo.veredito);

  return (
    <AdminSection>
      {primeiraFotoToast && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 rounded-token border border-acento bg-acento/10 px-3.5 py-3 text-[0.875rem] text-acento-texto"
        >
          🎉 A primeira foto chegou! O evento está ativo.
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 sm:gap-4">
        <p className="m-0 font-titulo text-lg">Ao vivo</p>
        <div className="flex items-center gap-2">
          {ultimaAtualizacao && <AtualizadoHa desde={ultimaAtualizacao} />}
          <RefreshButton
            loading={atualizando}
            onClick={() => {
              setAtualizando(true);
              void carregar().finally(() => setAtualizando(false));
            }}
          />
          <span className="inline-flex items-center gap-1.5 rounded-pilula bg-acento px-2.5 py-1 font-titulo text-xs text-sobre-acento">
            <span className="size-[0.4rem] rounded-full bg-current" />
            festa
          </span>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(7rem,1fr))]">
        <Stat n={`${pct}%`} rotulo="participação" destaqueClass={destaqueClass} />
        <Stat
          n={`${resumo.sessoesComUpload}/${resumo.expectedGuests}`}
          rotulo="convidados com foto"
        />
        <Stat n={String(resumo.totalFotos)} rotulo="fotos enviadas" />
        <Stat
          n={String(resumo.filaRevisao)}
          rotulo="na fila de revisão"
          {...(resumo.filaRevisao > 0 ? { destaqueClass: "text-critico" } : {})}
        />
      </div>

      <div className="mb-3">
        <div className="mb-1.5 flex justify-between text-xs text-ink-3">
          <span>
            {resumo.sessoesComUpload} de {resumo.expectedGuests} convidados fotografaram
          </span>
          <span className={pct >= 40 ? destaqueClass : "text-ink-3"}>meta: 40%</span>
        </div>
        <div className="relative h-1.5 overflow-hidden rounded-full bg-superficie-alta">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, pct)}%`,
              background:
                pct >= 40
                  ? "var(--acento)"
                  : pct >= 20
                    ? "var(--ink-2)"
                    : "var(--critico)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 w-px bg-bg/60"
            style={{ left: "40%" }}
          />
        </div>
      </div>

      <p className={`mb-4 mt-0 text-sm ${destaqueClass}`}>{ROTULO_VEREDITO[resumo.veredito]}</p>

      {resumo.ultimas.length > 0 && (
        <>
          <div className="mb-2 mt-0 flex items-center gap-2">
            <span className="text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
              Chegando agora
            </span>
            <span className="h-px flex-1 bg-linha" />
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-6">
            {resumo.ultimas.slice(0, 6).map((f) => (
              <span
                key={f.id}
                className="relative aspect-[3/4] overflow-hidden rounded-token bg-superficie-alta"
              >
                <img
                  src={f.thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
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
