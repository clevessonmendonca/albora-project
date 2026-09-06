import type { Pack } from "@albora/packs";
import { LandingCtaLink } from "../landing-cta-link";
import { LandingDemoLink } from "../landing-demo-link";
import { Accent, lightPillClasses, pillClasses, Section } from "../pieces";
import { HeroStage } from "./hero-stage";
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
  const example = t("landing.exemplo.nome");

  return (
    <Section className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${SIDE_PADDING}`}>
      <div className="grid items-center gap-[clamp(2rem,5vw,4rem)] lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="max-w-[36rem]">
          <span className="entra inline-flex items-center gap-2.5 rounded-pilula bg-superficie-alta py-[0.4375rem] pl-3 pr-4 text-[0.8125rem] text-ink-2">
            <span className="pulso size-1.5 rounded-full bg-acento" />
            {live
              ? `${live.fotos.toLocaleString("pt-BR")} fotos enviadas · ${live.eventos} ${live.eventos === 1 ? "festa rolando" : "festas rolando"}`
              : t("landing.rotulo")}
          </span>

          <h1
            className="heroi-titulo entra-2 tipo-display m-0 mt-6 font-light text-balance"
            style={{ fontSize: "clamp(2.5rem,5.6vw,4.5rem)" }}
          >
            {t("landing.titulo")} <Accent>{t("landing.titulo.destaque")}</Accent>
          </h1>

          <p className="entra-3 m-0 mt-[1.625rem] max-w-[32rem] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
            {t("landing.lede")}
          </p>

          <div className="mt-[2.125rem] flex flex-wrap gap-3">
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

          <p className="m-0 mt-[1.375rem] text-ink-3">
            Sem app · Sem login pra convidados · Comece grátis
          </p>
          <p className="m-0 mt-3 text-[0.84375rem]">
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
        </div>

        {/* Produto: QR → celular → telão ao vivo */}
        <HeroStage pack={pack} example={example} />
      </div>
    </Section>
  );
}
