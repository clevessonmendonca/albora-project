import { cn } from "@albora/ui-web";
import { LandingCtaLink } from "../landing-cta-link";
import { Brand } from "../brand";
import { Accent, Heading, Section, pillClasses, lightPillClasses } from "../pieces";
import {
  WIDTH,
  SIDE_PADDING,
  HREF_CRIAR_GRATIS,
  HREF_FORNECEDOR,
} from "../landing-data";

export function ClosingSection({
  packId,
  t,
}: {
  packId: string;
  t: (key: string) => string;
}) {
  return (
    <>
      <Section
        className={`pb-[clamp(2.5rem,6vw,5rem)] pt-0 ${SIDE_PADDING}`}
      >
        <div className="relative overflow-hidden rounded-superficie bg-gradient-chao-quente p-[clamp(2.75rem,7vw,6.875rem)_clamp(1.5rem,4vw,3.75rem)] text-center">
          <div className="relative mx-auto max-w-[53.75rem]">
            <Heading
              size="clamp(1.75rem, 4.6vw, 3.625rem)"
              className="m-0 leading-[1.04]"
            >
              {t("landing.fechamento")}{" "}
              <Accent>{t("landing.fechamento.destaque")}</Accent>
            </Heading>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LandingCtaLink
                href={HREF_CRIAR_GRATIS}
                packHint={packId}
                className={pillClasses}
              >
                {t("landing.cta")}
              </LandingCtaLink>
              <a href={HREF_FORNECEDOR} className={lightPillClasses}>
                Sou cerimonialista
              </a>
            </div>
          </div>
        </div>
      </Section>

      <footer
        className={cn(
          "mx-auto flex flex-wrap items-center justify-between gap-[1.125rem] pb-11 text-ink-2",
          WIDTH,
          SIDE_PADDING,
        )}
      >
        <span className="flex items-center gap-2.5">
          <Brand id="brand-footer" size={22} />
          <span className="font-titulo">
            Albora · o álbum coletivo da sua festa
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-4 text-ink-3">
          <a
            href="/privacidade"
            className="underline decoration-ink-3/40 underline-offset-2 transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink-2"
          >
            Privacidade
          </a>
          <span>Feito no Brasil</span>
        </span>
      </footer>
    </>
  );
}
