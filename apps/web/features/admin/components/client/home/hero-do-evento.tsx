import type { CSSProperties, ReactNode } from "react";

/** Composição do protótipo: identidade e ações à esquerda, tempo à direita.
 * A superfície do relógio é opaca para manter contraste em qualquer capa. */
export function HeroDoEvento({
  nome, meta, img, vars, kicker, destaque, legenda, acoes, contagem,
}: {
  nome: string;
  meta: string;
  img: string;
  vars: CSSProperties;
  kicker?: string;
  destaque: string;
  legenda: string;
  acoes: ReactNode;
  contagem?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-superficie bg-ink" style={vars}>
      <img src={img} alt="" className="absolute inset-0 z-0 size-full object-cover" />
      <span aria-hidden className="scrim-foto-forte absolute inset-0 z-10" />
      <div className="relative z-20 grid min-h-[25rem] items-end gap-8 p-[clamp(1.25rem,4vw,3rem)] xl:grid-cols-[minmax(0,1fr)_minmax(16rem,.7fr)] xl:items-center">
        <div className="min-w-0">
          {kicker && <p className="sobre-foto tipo-label m-0 mb-5">{kicker}</p>}
          <h1 className="sobre-foto m-0 break-words font-titulo text-[clamp(2.25rem,5vw,4rem)] font-light leading-tight tracking-titulo">{nome}</h1>
          {meta && <p className="sobre-foto tipo-body mt-4 mb-0">{meta}</p>}
          <div className="mt-6 flex flex-wrap gap-3 [&>a]:bg-superficie [&>button]:bg-superficie">{acoes}</div>
        </div>
        <div className="min-w-0 rounded-superficie bg-superficie p-6 text-ink">
          {contagem ?? (
            <div>
              <p className="m-0 break-words font-titulo text-[clamp(2rem,4vw,3rem)] font-light leading-tight">{destaque}</p>
              {legenda && <p className="tipo-body mt-3 mb-0 text-ink-2">{legenda}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
