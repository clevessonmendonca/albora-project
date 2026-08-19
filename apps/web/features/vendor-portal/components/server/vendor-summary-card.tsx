import React from "react";
import type { ResumoDoFornecedor } from "@albora/db";

type Props = {
  vendorName: string;
  resumo: ResumoDoFornecedor;
};

/**
 * Card de resumo do fornecedor — o gancho de uso recorrente do B2B2C (mapa de
 * novas implementações, item 6). `resumo.h1Medio` já vem ponderado por
 * `resumoDoFornecedor` (Σ sessoesComUpload / Σ expectedGuests através de
 * todos os eventos do vendor) — este componente só formata, nunca recalcula.
 */
export function VendorSummaryCard({ vendorName, resumo }: Props) {
  const pct = Math.round(resumo.h1Medio * 100);

  return (
    <section className="rounded-superficie border border-linha bg-superficie p-6">
      <p className="m-0 mb-4 text-[0.8125rem] uppercase tracking-rotulo text-ink-3">
        {vendorName}
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
        <Stat n={String(resumo.totalEventos)} rotulo="eventos" />
        <Stat n={`${pct}%`} rotulo="H1 médio" />
        <Stat n={String(resumo.totalFotos)} rotulo="fotos no ar" />
      </div>
    </section>
  );
}

function Stat({ n, rotulo }: { n: string; rotulo: string }) {
  return (
    <div className="rounded-token bg-superficie-alta p-3.5">
      <p className="m-0 font-titulo text-2xl font-light tabular-nums text-acento-texto">{n}</p>
      <p className="mb-0 mt-1.5 text-xs text-ink-2">{rotulo}</p>
    </div>
  );
}
