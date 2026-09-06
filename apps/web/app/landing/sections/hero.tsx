import type { Pack } from "@albora/packs";
import Image from "next/image";
import { LandingCtaLink } from "../landing-cta-link";
import { LandingDemoLink } from "../landing-demo-link";
import { Accent, lightPillClasses, pillClasses, Section } from "../pieces";
import {
  HREF_CRIAR_GRATIS,
  HREF_DEMO,
  SIDE_PADDING,
  type LiveStats,
} from "../landing-data";

export function HeroSection({
  pack,
  t,
  live,
}: {
  pack: Pack;
  t: (key: string) => string;
  live?: LiveStats;
}) {
  return (
    <Section className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${SIDE_PADDING}`}>
      <div className="grid items-center gap-[clamp(2.375rem,5vw,3.5rem)] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="max-w-[38rem]">
          <p className="tipo-label uppercase text-acento-texto">
            {t("landing.rotulo")}
          </p>

          <h1
            className="entra-2 tipo-display m-0 mt-5 font-light text-balance"
            style={{ fontSize: "clamp(2.625rem,6.4vw,5rem)" }}
          >
            {t("landing.titulo")} <Accent>{t("landing.titulo.destaque")}</Accent>
          </h1>

          <p className="entra-3 m-0 mt-6 max-w-[34ch] text-[clamp(1.0625rem,2vw,1.25rem)] leading-normal text-ink-2">
            {t("landing.lede")}
          </p>

          <div className="mt-[2.125rem] flex flex-wrap items-center gap-4">
            <LandingCtaLink
              href={HREF_CRIAR_GRATIS}
              packHint={pack.id}
              className={pillClasses}
            >
              {t("landing.cta")}
            </LandingCtaLink>
            <a href="#telao" className={lightPillClasses}>
              Ver o telão ↓
            </a>
          </div>

          <p className="m-0 mt-4 text-sm text-ink-3">
            <b className="font-semibold text-acento-texto">Grátis pra começar.</b>{" "}
            Pague uma vez, só se quiser tudo.
          </p>

          {live ? (
            <div className="mt-9 inline-flex items-center gap-2.5 border-t border-linha pt-5 text-sm text-ink-2">
              <span className="pulso size-1.5 rounded-full bg-acento" />
              <b className="font-semibold text-ink [font-variant-numeric:tabular-nums]">
                {live.fotos.toLocaleString("pt-BR")}
              </b>{" "}
              fotos subidas em festas esta semana
            </div>
          ) : (
            <p className="m-0 mt-4 text-[0.84375rem]">
              <a
                href="/scan"
                className="text-ink-3 underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink-2"
              >
                Já tem o QR da festa? Escanear ou colar o link
              </a>
              {" · "}
              <LandingDemoLink
                href={HREF_DEMO}
                packHint={pack.id}
                className="text-ink-3 underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:text-ink-2"
              >
                Abrir a demo
              </LandingDemoLink>
            </p>
          )}
        </div>

        {/* Foto real da festa */}
        <div className="relative mx-auto aspect-[4/5] w-full max-w-[22.5rem] overflow-hidden border border-ink-borda-forte lg:ml-auto lg:mr-0">
          <Image
            src="/landing/gen/10-dia-jardim.png"
            alt="Convidados brindando com os noivos num casamento de dia, ao lado da placa do Albora"
            fill
            priority
            sizes="(max-width:820px) 88vw, 360px"
            className="object-cover"
          />
        </div>
      </div>
    </Section>
  );
}
