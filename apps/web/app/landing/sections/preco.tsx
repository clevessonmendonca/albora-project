import type { Pack } from "@albora/packs";
import { LandingCtaLink } from "../landing-cta-link";
import { Section, Heading, Accent, pillClasses, lightPillClasses } from "../pieces";
import { HREF_CRIAR_GRATIS, HREF_CRIAR_COMPLETO } from "../landing-data";

export function PrecoSection({ pack }: { pack: Pack }) {
  return (
    <Section
      id="preco"
      reveal
      className="bg-superficie py-[clamp(3.5rem,7vw,5.25rem)] px-[clamp(1.125rem,4vw,2.75rem)]"
    >
      <p className="tipo-label uppercase text-acento-texto">Preço</p>
      <Heading size="clamp(1.75rem,3.6vw,2.75rem)">
        Comece grátis. <Accent>Pague uma vez, só se quiser tudo.</Accent>
      </Heading>

      <div className="mt-10 grid gap-3.5 md:grid-cols-3">
        <div className="flex flex-col gap-2 rounded-token border border-ink-borda-forte bg-bg p-6">
          <span className="tipo-display text-[1.375rem]">Grátis</span>
          <span className="tipo-display text-[1.875rem]">R$ 0</span>
          <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0 text-[0.9rem] text-ink-2">
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Convidados e fotos sem limite
            </li>
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              QR, feed e galeria
            </li>
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Envio aberto por 48h
            </li>
          </ul>
          <LandingCtaLink
            href={HREF_CRIAR_GRATIS}
            packHint={pack.id}
            className={`${lightPillClasses} mt-auto justify-center`}
          >
            Criar meu evento
          </LandingCtaLink>
        </div>

        <div className="flex flex-col gap-2 rounded-token border border-ink-borda-forte border-ink bg-bg p-6 shadow-[inset_0_0_0_1px_var(--ink)]">
          <span className="tipo-display text-[1.375rem]">Celebração</span>
          <span className="tipo-display text-[1.875rem]">
            pague uma vez
            <small className="font-corpo text-sm text-ink-3"> / por evento</small>
          </span>
          <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0 text-[0.9rem] text-ink-2">
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Tudo do grátis
            </li>
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Telão com a identidade do evento
            </li>
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Missões e confessionário
            </li>
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Exportação pra sua nuvem
            </li>
          </ul>
          <LandingCtaLink
            href={HREF_CRIAR_COMPLETO}
            packHint={pack.id}
            className={`${pillClasses} mt-auto justify-center`}
          >
            Criar meu evento
          </LandingCtaLink>
        </div>

        <div className="flex flex-col gap-2 rounded-token border border-ink-borda-forte bg-bg p-6">
          <span className="tipo-display text-[1.375rem]">Livro</span>
          <span className="tipo-display text-[1.875rem]">opcional</span>
          <ul className="m-0 mt-2.5 flex list-none flex-col gap-2 p-0 text-[0.9rem] text-ink-2">
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Álbum impresso
            </li>
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Curadoria por momento
            </li>
            <li className="before:mr-1 before:text-acento-texto before:content-['—']">
              Entrega em casa
            </li>
          </ul>
          <a href={HREF_CRIAR_GRATIS} className={`${lightPillClasses} mt-auto justify-center`}>
            Ver o livro
          </a>
        </div>
      </div>
    </Section>
  );
}
