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
    <Card elevation={1} className="overflow-hidden p-0">
      <div className="border-b border-linha px-5 py-4 sm:px-6"><p className="tipo-caption m-0 text-ink-2">Visão consolidada de {vendorName}</p></div>
      <div className="grid sm:grid-cols-3">
        <Stat n={String(resumo.totalEventos)} rotulo="eventos" />
        <Stat n={`${pct}%`} rotulo="participação média" />
        <Stat n={String(resumo.totalFotos)} rotulo="fotos publicadas" />
      </div>
    </Card>
  );
}

function Stat({ n, rotulo }: { n: string; rotulo: string }) {
  return (
    <div className="border-b border-linha p-5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:p-6">
      <p className="m-0 font-titulo text-4xl font-normal tabular-nums text-ink">{n}</p>
      <p className="tipo-caption mb-0 mt-1.5 text-ink-2">{rotulo}</p>
    </div>
  );
}
