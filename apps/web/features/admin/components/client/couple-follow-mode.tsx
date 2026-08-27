"use client";

import type { CodigoDaTese } from "@albora/core";
import { Switch } from "@albora/ui-web";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { AdminCard } from "@/features/admin/components/server/admin-shell";

type Resumo = {
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
  /** O painel denso (planner/owner), pronto no servidor — exibido quando o casal liga o toggle. */
  dense: ReactNode;
};

/**
 * Modo Acompanhar do casal: foto-first, poucos números grandes, sem os
 * controles de pânico/moderação do painel denso (esses continuam exclusivos
 * de `EventControls`, atrás do mesmo `canManageCoupleOnly`/role de sempre).
 * Reusa o mesmo endpoint e padrão de URL assinada de `LiveSummary`.
 */
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
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-ink-3">
            {verPainelCompleto ? "Painel completo" : "Acompanhar"}
          </p>
          {!verPainelCompleto && ultimaAtualizacao && (
            <AtualizadoHa desde={ultimaAtualizacao} />
          )}
          {!verPainelCompleto && (
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
          )}
        </div>
        <label className="flex items-center gap-2.5 text-sm text-ink-2">
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
              <p className="m-0 text-critico">
                Não foi possível carregar agora. Tente recarregar a página.
              </p>
            </AdminCard>
          )}

          {!resumo && !erro && (
            <AdminCard>
              <p className="m-0 text-ink-2">Carregando…</p>
            </AdminCard>
          )}

          {resumo && (
            <>
              <AdminCard variant="highlight">
                <div className="grid grid-cols-2 gap-4">
                  <BigStat
                    n={`${Math.round(resumo.participacao * 100)}%`}
                    rotulo="dos convidados já fotografaram"
                  />
                  <BigStat n={String(resumo.totalFotos)} rotulo="fotos na festa" />
                </div>
                <p className={`mb-0 mt-5 text-sm ${vereditoTextClass(resumo.veredito)}`}>
                  {ROTULO_VEREDITO[resumo.veredito]}
                </p>
              </AdminCard>

              {resumo.ultimas.length > 0 && (
                <AdminCard>
                  <p className="mb-3 mt-0 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
                    Chegando agora
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {resumo.ultimas.map((f) => (
                      <span
                        key={f.id}
                        className="relative aspect-[3/4] overflow-hidden rounded-token bg-superficie-alta shadow-suave"
                      >
                        {/* URL assinada */}
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

function AtualizadoHa({ desde }: { desde: Date }) {
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

function BigStat({ n, rotulo }: { n: string; rotulo: string }) {
  return (
    <div>
      <p className="m-0 font-titulo text-[2.75rem] font-light tabular-nums text-acento-texto">
        {n}
      </p>
      <p className="mb-0 mt-1.5 text-sm text-ink-2">{rotulo}</p>
    </div>
  );
}
