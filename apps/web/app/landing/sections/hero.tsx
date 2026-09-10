import { resolvePackText, type Pack } from "@albora/packs";
import Image from "next/image";
import { LandingCtaLink } from "../landing-cta-link";
import { Accent, Section } from "../pieces";
import { HREF_CRIAR_GRATIS, SIDE_PADDING } from "../landing-data";

export function HeroSection({ pack }: { pack: Pack }) {
  const t = (chave: string) => resolvePackText(pack, chave);

  return (
    <Section className={`pb-[clamp(3rem,6vw,4.375rem)] pt-[clamp(1.875rem,4vw,3.25rem)] ${SIDE_PADDING}`}>
      <div className="grid items-center gap-[clamp(2.375rem,5vw,3.5rem)] md:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="max-w-[38rem]">
          <h1
            className="heroi-titulo entra-2 tipo-display m-0 font-light text-balance"
            style={{ fontSize: "clamp(2.5rem,5.6vw,4.5rem)" }}
          >
            {t("landing.titulo")} <Accent>{t("landing.titulo.destaque")}</Accent>
          </h1>

          <p className="entra-3 m-0 mt-6 max-w-[40ch] text-[clamp(1.0625rem,2vw,1.1875rem)] leading-normal text-ink-2">
            {t("landing.lede")}{" "}
            <b className="font-semibold text-ink">Sem instalar app.</b>
          </p>

          <div className="mt-[2.125rem] flex flex-wrap items-center gap-4">
            <LandingCtaLink
              href={HREF_CRIAR_GRATIS}
              packHint={pack.id}
              className="pilula inline-flex items-center justify-center gap-2 rounded-pilula bg-ink px-[1.375rem] py-3.5 font-medium text-bg no-underline"
            >
              {t("landing.cta")} <span aria-hidden="true">→</span>
            </LandingCtaLink>
            <a href="#demo" className="elo px-1 py-3.5 font-medium text-ink no-underline">
              Ver como funciona ↓
            </a>
          </div>

          <p className="m-0 mt-3.5 max-w-[38ch] text-sm leading-normal text-ink-2">
            Até 200 fotos no Grátis.{" "}
            <b className="font-semibold text-acento-texto">Completo por R$ 59,90 uma vez.</b>
          </p>
        </div>

        {/* Foto real da festa */}
        <div className="mx-auto w-full max-w-[24rem] lg:ml-auto lg:mr-0">
          <div className="relative aspect-[4/5] overflow-hidden border border-ink-borda-forte">
            <Image
              src="/landing/gen/10-dia-jardim.png"
              alt="Convidados brindando com o casal numa festa de dia, ao lado da placa do Albora"
              fill
              priority
              sizes="(max-width:820px) 88vw, 384px"
              className="heroi-imagem object-cover"
            />
          </div>
          <p className="m-0 ml-auto mt-4 max-w-[34ch] text-[0.8125rem] text-ink-2">
            O abraço que você não viu. A foto que vai querer guardar.
          </p>
        </div>
      </div>
    </Section>
  );
}
