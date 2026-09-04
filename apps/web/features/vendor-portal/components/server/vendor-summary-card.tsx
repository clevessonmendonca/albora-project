import React from "react";
import type { ResumoDoFornecedor } from "@albora/db";
import { Card } from "@albora/ui-web";

type Props = {
  vendorName: string;
  resumo: ResumoDoFornecedor;
};

/** `resumo.h1Medio` chega ponderado de `resumoDoFornecedor` — este componente só formata, nunca recalcula. */
export function VendorSummaryCard({ vendorName, resumo }: Props) {
  const pct = Math.round(resumo.h1Medio * 100);

  return (
    <Card elevation={1} className="p-6">
      <p className="tipo-label m-0 mb-4 uppercase text-ink-3">{vendorName}</p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
        <Stat n={String(resumo.totalEventos)} rotulo="eventos" />
        <Stat n={`${pct}%`} rotulo="H1 médio" />
        <Stat n={String(resumo.totalFotos)} rotulo="fotos no ar" />
      </div>
    </Card>
  );
}

function Stat({ n, rotulo }: { n: string; rotulo: string }) {
  return (
    <div className="rounded-token bg-superficie-alta p-3.5">
      <p className="m-0 font-titulo text-2xl font-light tabular-nums text-acento-texto">{n}</p>
      <p className="tipo-label mb-0 mt-1.5 text-ink-2">{rotulo}</p>
    </div>
  );
}
