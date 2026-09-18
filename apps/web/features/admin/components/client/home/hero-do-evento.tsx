import type { CSSProperties, ReactNode } from "react";

/**
 * Herói da Home. É uma peça fotográfica, não um cabeçalho de dashboard: a foto
 * sangra, o texto vive sobre scrim e a cor do casal aparece só no realce. O que
 * muda entre as fases é a linha de destaque — não a composição.
 */
export function HeroDoEvento({
  nome,
  meta,
  img,
  vars,
  kicker,
  destaque,
  legenda,
  acoes,
}: {
  nome: string;
  meta: string;
  img: string;
  vars: CSSProperties;
  /** Linha curta acima do nome. Ex.: "Semana do casamento". */
  kicker?: string;
  /** Número ou palavra de maior peso. Ex.: "39" ou "Ao vivo". */
  destaque: string;
  legenda: string;
  acoes: ReactNode;
}) {
  return (
    <section
      className="relative overflow-hidden rounded-superficie border border-linha shadow-suave"
      style={vars}
    >
      <div className="relative aspect-[16/12] w-full sm:aspect-[21/9]">
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden className="scrim-foto-forte absolute inset-0" />

        <div className="absolute inset-x-0 bottom-0 flex flex-col p-[clamp(1.25rem,4vw,2.5rem)]">
          {kicker && (
            <span className="sobre-foto tipo-label mb-2 uppercase tracking-[0.18em] opacity-90">
              {kicker}
            </span>
          )}
          <h1
            className="sobre-foto tipo-title m-0 text-[clamp(1.7rem,5vw,2.8rem)] leading-[1.03]"
            style={{ fontFamily: "var(--fonte-titulo, inherit)" }}
          >
            {nome}
          </h1>
          {meta && <p className="sobre-foto m-0 mt-2 text-[0.95rem] opacity-90">{meta}</p>}

          <p className="m-0 mt-4 flex items-baseline gap-2">
            <span className="sobre-foto font-titulo text-[clamp(2.4rem,8vw,4rem)] leading-none">
              {destaque}
            </span>
            <span className="sobre-foto text-[0.95rem] opacity-90">{legenda}</span>
          </p>
        </div>
      </div>

      {/* Ações fora da foto: contraste garantido em qualquer imagem. */}
      <div className="flex flex-col gap-2.5 border-t border-linha bg-superficie p-[clamp(1rem,3vw,1.5rem)] sm:flex-row sm:items-center">
        {acoes}
      </div>
    </section>
  );
}
