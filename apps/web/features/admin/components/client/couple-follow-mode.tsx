"use client";

import type { CodigoDaTese } from "@albora/core";
import { Skeleton, Switch } from "@albora/ui-web";
import { type ReactNode, useState } from "react";
import { AdminCard } from "@/features/admin/components/server/admin-shell";
import { useAdminResource } from "@/features/admin/hooks/use-admin-resource";
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
  const [atualizando, setAtualizando] = useState(false);

  const {
    dado: resumo,
    erro,
    atualizadoEm: ultimaAtualizacao,
    recarregar: carregar,
  } = useAdminResource<Resumo>(`/api/admin/events/${eventoId}`, {
    intervaloMs: verPainelCompleto ? undefined : INTERVALO_MS,
  });

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
              <div className="flex flex-col gap-4">
                <div className="flex gap-8">
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-20" />
                    <Skeleton variant="text" className="h-3 w-36" />
                  </div>
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-10 w-16" />
                    <Skeleton variant="text" className="h-3 w-28" />
                  </div>
                </div>
                <Skeleton variant="text" className="h-3.5 w-56" />
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
