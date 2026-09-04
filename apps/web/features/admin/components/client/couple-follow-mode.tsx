"use client";

import type { CodigoDaTese } from "@albora/core";
import { Switch } from "@albora/ui-web";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/features/admin/components/server/admin-shell";
import { AtualizadoHa, RefreshButton } from "./refresh-control";

type Resumo = {
  expectedGuests: number;
  sessoesComUpload: number;
  totalFotos: number;
  participacao: number;
  veredito: CodigoDaTese;
  ultimas: { id: string; thumb: string; criadaEm: string }[];
};

const INTERVALO_MS = 30_000;

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "A festa está pegando — participação na meta",
  "funil.mexe_em_friccao": "Fotos ainda chegando — vale um lembrete no microfone",
  "funil.parar": "Poucas fotos por enquanto — bom momento para lembrar os convidados",
};

function vereditoTextClass(veredito: CodigoDaTese): string {
  if (veredito === "funil.tese_validada") return "text-acento-texto";
  if (veredito === "funil.mexe_em_friccao") return "text-ink";
  return "text-critico";
}

type Props = {
  eventoId: string;
  dense: ReactNode;
};

export function CoupleFollowMode({ eventoId, dense }: Props) {
  const [verPainelCompleto, setVerPainelCompleto] = useState(false);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [erro, setErro] = useState(false);
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date | null>(null);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/events/${eventoId}`);
      if (!r.ok) throw new Error("falhou");
      setResumo((await r.json()) as Resumo);
      setErro(false);
      setUltimaAtualizacao(new Date());
    } catch {
      setErro(true);
    }
  }, [eventoId]);

  useEffect(() => {
    if (verPainelCompleto) return;
    void carregar();
    const id = window.setInterval(() => void carregar(), INTERVALO_MS);
    return () => window.clearInterval(id);
  }, [carregar, verPainelCompleto]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <p className="tipo-label m-0 text-ink-3">
            {verPainelCompleto ? "Painel completo" : "Acompanhar"}
          </p>
          {!verPainelCompleto && ultimaAtualizacao && (
            <AtualizadoHa desde={ultimaAtualizacao} />
          )}
          {!verPainelCompleto && (
            <RefreshButton
              loading={atualizando}
              onClick={() => {
                setAtualizando(true);
                void carregar().finally(() => setAtualizando(false));
              }}
            />
          )}
        </div>
        <label className="tipo-caption flex items-center gap-2.5 text-ink-2">
          Ver painel completo
          <Switch
            checked={verPainelCompleto}
            onChange={setVerPainelCompleto}
            label="Ver painel completo"
          />
        </label>
      </div>

      {verPainelCompleto ? (
        dense
      ) : (
        <>
          {erro && !resumo && (
            <AdminCard>
              <p role="alert" className="tipo-body m-0 text-critico">
                Não foi possível carregar agora. Tente recarregar a página.
              </p>
            </AdminCard>
          )}

          {!resumo && !erro && (
            <AdminCard>
              <div className="animate-pulse flex flex-col gap-4">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-2">
                    <div className="h-10 w-20 rounded-token bg-superficie-alta" />
                    <div className="h-3 w-36 rounded-full bg-superficie-alta" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-10 w-16 rounded-token bg-superficie-alta" />
                    <div className="h-3 w-28 rounded-full bg-superficie-alta" />
                  </div>
                </div>
                <div className="h-3.5 w-56 rounded-full bg-superficie-alta" />
              </div>
            </AdminCard>
          )}

          {resumo && (
            <>
              <AdminCard variant="highlight">
                <div className="grid grid-cols-2 gap-4">
                  <BigStat
                    n={`${Math.round(resumo.participacao * 100)}%`}
                    rotulo={`${resumo.sessoesComUpload} de ${resumo.expectedGuests} convidados`}
                  />
                  <BigStat n={String(resumo.totalFotos)} rotulo="fotos na festa" />
                </div>
                <p className={`tipo-caption mb-0 mt-5 ${vereditoTextClass(resumo.veredito)}`}>
                  {ROTULO_VEREDITO[resumo.veredito]}
                </p>
              </AdminCard>

              {resumo.ultimas.length > 0 && (
                <AdminCard>
                  <p className="tipo-label mb-3 mt-0 text-acento-texto">Chegando agora</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {resumo.ultimas.map((f) => (
                      <span
                        key={f.id}
                        className="relative aspect-[3/4] overflow-hidden rounded-token bg-superficie-alta shadow-suave"
                      >
                        <img src={f.thumb} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
                      </span>
                    ))}
                  </div>
                </AdminCard>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function BigStat({ n, rotulo }: { n: string; rotulo: string }) {
  return (
    <div>
      <p className="tipo-display m-0 tabular-nums text-acento-texto">{n}</p>
      <p className="tipo-caption mb-0 mt-1.5 text-ink-2">{rotulo}</p>
    </div>
  );
}
