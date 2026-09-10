import type { Pack } from "@albora/packs";
import { LandingCtaLink } from "../landing-cta-link";
import { Heading, Accent, pillClasses } from "../pieces";
import { HREF_CRIAR_GRATIS } from "../landing-data";

export function FechoSection({ pack }: { pack: Pack }) {
  return (
    <section id="experimentar" className="bg-superficie">
      <div className="mx-auto max-w-[78rem] px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(4.5rem,9vw,7rem)] text-center">
        <Heading size="clamp(2rem,5vw,3.75rem)">
          A próxima foto pode ser <Accent>a sua favorita.</Accent>
        </Heading>
        <p className="mx-auto mt-5 mb-8 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ink-2">
          Teste o álbum antes da festa. Veja como seus convidados vão
          participar.
        </p>
        <LandingCtaLink href={HREF_CRIAR_GRATIS} packHint={pack.id} className={pillClasses}>
          Experimentar meu álbum →
        </LandingCtaLink>
        <p className="mt-9 text-sm text-ink-3">
          Sem conta e sem cobrança nesta demonstração.
        </p>
      </div>
    </section>
  );
}
