import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { Pack } from "@albora/packs";
import Image from "next/image";
import type { CSSProperties } from "react";
import { LandingCtaLink } from "../landing-cta-link";
import { LandingDemoLink } from "../landing-demo-link";
import { Accent, pillClasses, lightPillClasses, Section } from "../pieces";
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
  const darkTokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "dark" },
  });

  return (
    <Section className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${SIDE_PADDING}`}>
      <div
        className="relative overflow-hidden rounded-superficie"
        style={{
          ...(toVariables(darkTokens) as CSSProperties),
          minHeight: "clamp(30rem, 58vw, 42rem)",
        }}
      >
        <Image
          src="/landing/hero.webp"
          alt="Convidados fotografando com celulares em jantar festivo à luz de velas"
          fill
          priority
          sizes="100vw"
          className="heroi-imagem absolute inset-0 h-full w-full object-cover"
        />

        {/* Gradient forte no lado do texto — garante legibilidade total */}
        <div
          className="absolute inset-0"
          style={{
            background: [
              "linear-gradient(108deg,",
              "var(--bg) 32%,",
              "color-mix(in srgb, var(--bg) 88%, transparent) 44%,",
              "color-mix(in srgb, var(--bg) 50%, transparent) 58%,",
              "color-mix(in srgb, var(--bg) 18%, transparent) 74%,",
              "transparent 90%)",
            ].join(" "),
          }}
        />
        <div
          className="absolute inset-x-0 bottom-0 h-1/4"
          style={{
            background:
              "linear-gradient(to top, var(--bg), color-mix(in srgb, var(--bg) 60%, transparent) 50%, transparent)",
          }}
        />

        <div className="relative flex min-h-[inherit] flex-col justify-center p-[clamp(3rem,7vw,6rem)_clamp(1.5rem,4.5vw,4.5rem)]">
          <div className="max-w-[34rem]">
            <span className="entra inline-flex items-center gap-2.5 rounded-pilula bg-superficie-alta py-[0.4375rem] pl-3 pr-4 text-[0.8125rem] text-ink-2">
              <span className="pulso size-1.5 rounded-full bg-acento" />
              {live
                ? `${live.fotos.toLocaleString("pt-BR")} fotos enviadas · ${live.eventos} ${live.eventos === 1 ? "festa rolando" : "festas rolando"}`
                : t("landing.rotulo")}
            </span>

            <h1 className="heroi-titulo entra-2 m-0 mt-6 font-titulo text-[clamp(2.5rem,5.6vw,4.625rem)] font-light leading-[1.02] tracking-titulo text-balance">
              {t("landing.titulo")}{" "}
              <Accent>{t("landing.titulo.destaque")}</Accent>
            </h1>

            <p className="entra-3 m-0 mt-[1.625rem] max-w-[30rem] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
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
              <a href="#momentos" className={lightPillClasses}>
                Ver as fotos
              </a>
            </div>

            <p className="m-0 mt-[1.375rem] text-ink-3">
              Montar é grátis · não pedimos cartão · você decide antes de
              imprimir o QR
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
        </div>
      </div>
    </Section>
  );
}
