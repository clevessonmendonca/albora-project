import "./landing.css";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { resolvePackText, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import type { CSSProperties } from "react";
import { AnimatedBrand } from "./animated-brand";
import { LandingBeacon } from "./landing-beacon";
import { LandingCtaLink } from "./landing-cta-link";
import { LandingStickyCta } from "./landing-sticky-cta";
import { pillClasses } from "./pieces";
import { SIDE_PADDING, HREF_CRIAR_GRATIS, type LiveStats } from "./landing-data";
import {
  HeroSection,
  NoAppSection,
  ScrollDemoSection,
  ExperienceSection,
  MomentsSection,
  PhotoCorridorSection,
  MissionsSection,
  AlbumChaptersSection,
  IdentitySection,
  BookSection,
  ChoresEliminatedSection,
  AntesDaFestaSection,
  VeteranSection,
  PricingSection,
  FaqSection,
  FechoSection,
} from "./sections";

export type { LiveStats };

export function LandingPage({ pack, live }: { pack: Pack; live?: LiveStats }) {
  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "light" },
  });

  const t = (key: string) => resolvePackText(pack, key);

  return (
    <div
      className="min-h-screen overflow-x-clip bg-bg font-corpo leading-normal text-ink"
      style={toVariables(tokens) as CSSProperties}
    >
      <LandingBeacon packHint={pack.id} />

      <header
        className={cn(
          "sticky top-0 z-40 flex items-center justify-between gap-6 border-b border-linha bg-bg py-3.5",
          SIDE_PADDING,
        )}
      >
        <span className="entra">
          <AnimatedBrand />
        </span>

        <nav className="nav-topo gap-[1.625rem] text-ink-2">
          <a href="#como" className="elo text-inherit no-underline">
            Como funciona
          </a>
          <a href="#telao" className="elo text-inherit no-underline">
            O telão
          </a>
          <a href="#preco" className="elo text-inherit no-underline">
            Preço
          </a>
        </nav>

        <LandingCtaLink
          href={HREF_CRIAR_GRATIS}
          packHint={pack.id}
          className={cn(pillClasses, "px-[1.375rem] py-[0.6875rem] text-sm")}
        >
          {t("landing.cta")}
        </LandingCtaLink>
      </header>

      <HeroSection pack={pack} t={t} {...(live !== undefined ? { live } : {})} />
      <NoAppSection pack={pack} t={t} />
      <ScrollDemoSection
        example={example}
        missionTitle={missions[0]?.title ?? t("missao.livre")}
      />
      <ExperienceSection />
      <MomentsSection t={t} />
      <PhotoCorridorSection />
      <MissionsSection missions={missions} t={t} />
      <AlbumChaptersSection eventMoments={eventMoments} />
      <IdentitySection example={example} t={t} />
      <BookSection places={places} />
      <ChoresEliminatedSection />
      <AntesDaFestaSection packId={pack.id} />
      <VeteranSection packId={pack.id} t={t} />
      <PricingSection packId={pack.id} t={t} />
      <FaqSection />
      <FechoSection pack={pack} />

      <footer className="border-t border-linha bg-bg">
        <div
          className={cn(
            "mx-auto flex max-w-[78rem] flex-wrap items-center justify-between gap-4 py-8 text-sm text-ink-3",
            SIDE_PADDING,
          )}
        >
          <span>Albora · Feito no Brasil</span>
          <a href="/privacidade" className="underline hover:text-ink-2">
            Privacidade
          </a>
        </div>
      </footer>

      <LandingStickyCta
        href={HREF_CRIAR_GRATIS}
        packHint={pack.id}
        label={t("landing.cta")}
      />
    </div>
  );
}
