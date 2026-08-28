import type { CodigoDaTese, DegrauDoFunil, EtapaDaEspinha } from "@albora/core";
import type { EventLiveMetrics } from "@albora/db";

const ROTULO_VEREDITO: Record<CodigoDaTese, string> = {
  "funil.tese_validada": "Meta de participação alcançada",
  "funil.mexe_em_friccao": "Ainda abaixo da meta",
  "funil.parar": "Participação crítica",
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

/** KPIs agregados — espelho do Insights do casal, sem thumbs/nomes. */
export function OpsEventAggregates({
  slug,
  metrics,
}: {
  slug: string;
  metrics: EventLiveMetrics;
}) {
  const pct = Math.round(metrics.participacao * 100);
  const destaqueClass = vereditoTextClass(metrics.veredito);
  const ondeMorreu = metrics.degraus.find((d: DegrauDoFunil, i: number, all: DegrauDoFunil[]) => {
    const prev = all[i - 1];
    return prev && d.sessoes < prev.sessoes * 0.7;
  });

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="m-0 text-sm text-ink-3">/{slug}</p>
        <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={`${pct}%`} rotulo="H1 participação" destaqueClass={destaqueClass} />
          <Stat n={String(metrics.sessoesComUpload)} rotulo="fotografaram" />
          <Stat n={String(metrics.expectedGuests)} rotulo="esperados" />
          <Stat n={String(metrics.totalFotos)} rotulo="fotos no ar" />
        </div>
        <p className={`mb-0 mt-3 text-sm ${destaqueClass}`}>
          {ROTULO_VEREDITO[metrics.veredito]}
        </p>
        {ondeMorreu && (
          <p className="mb-0 mt-2 text-sm text-ink-3">
            Maior queda em «{ROTULO_ETAPA[ondeMorreu.etapa]}».
          </p>
        )}
      </section>

      <section>
        <h2 className="m-0 font-titulo text-lg">Funil</h2>
        <ul className="mt-3 list-none p-0">
          {metrics.degraus.map((d) => (
            <li
              key={d.etapa}
              className="flex justify-between border-b border-linha py-2 text-sm"
            >
              <span>{ROTULO_ETAPA[d.etapa]}</span>
              <span className="tabular-nums">
                {d.sessoes}
                {d.retencao === null ? "" : ` · ${Math.round(d.retencao * 100)}%`}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="m-0 font-titulo text-lg">Como chegaram</h2>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(metrics.entradasPorVia.qr)} rotulo="QR impresso" />
          <Stat n={String(metrics.entradasPorVia.wa)} rotulo="WhatsApp" />
          <Stat n={String(metrics.entradasPorVia.link)} rotulo="link copiado" />
        </div>
      </section>

      <section>
        <h2 className="m-0 font-titulo text-lg">Antes e depois do feed</h2>
        <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(7rem,1fr))] gap-3">
          <Stat n={String(metrics.uploadsAntesDoFeed)} rotulo="antes do feed" />
          <Stat n={String(metrics.uploadsDepoisDoFeed)} rotulo="depois do feed" />
        </div>
      </section>
    </div>
  );
}
