import "./landing.css";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { resolvePackText, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import type { CSSProperties } from "react";
import { AnimatedBrand } from "./animated-brand";
import { LandingBeacon } from "./landing-beacon";
import { LandingCtaLink } from "./landing-cta-link";
import { LandingDemoLink } from "./landing-demo-link";
import { pillClasses } from "./pieces";
import {
  SIDE_PADDING,
  HREF_CRIAR_GRATIS,
  HREF_DEMO,
  HREF_FORNECEDORES,
  type LiveStats,
} from "./landing-data";
import {
  HeroSection,
  ProvaSection,
  DemoSection,
  PerspectivasSection,
  TelaoSection,
  DepoisSection,
  PrecoSection,
  VendorInviteSection,
  FaqSection,
  FechoSection,
} from "./sections";

export type { LiveStats };

export function LandingPage({ pack }: { pack: Pack; live?: LiveStats }) {
  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "light" },
  });
  const darkTokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "dark" },
  });

  const t = (chave: string) => resolvePackText(pack, chave);

  return (
    <div
      className="landing-page min-h-screen bg-bg font-corpo leading-normal text-ink"
      style={toVariables(tokens) as CSSProperties}
    >
      <LandingBeacon packHint={pack.id} />

      <a
        href="#conteudo"
        className="pilula sr-only rounded-pilula bg-ink px-4 py-3 text-bg focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50"
      >
        Pular para o conteúdo
      </a>

      <header
        className={cn(
          "sticky top-0 z-40 flex items-center justify-between gap-6 border-b border-linha bg-bg py-3.5",
          SIDE_PADDING,
        )}
      >
        <a href="#conteudo" className="entra inline-flex items-center" aria-label="Albora">
          <AnimatedBrand />
        </a>

        <nav className="nav-topo gap-[1.625rem] text-ink-2">
          <a href="#demo" className="elo text-inherit no-underline">
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

      <main id="conteudo" tabIndex={-1}>
        <HeroSection pack={pack} />
        <ProvaSection />
        <DemoSection pack={pack} />
        <PerspectivasSection pack={pack} />
        <TelaoSection pack={pack} />
        <DepoisSection />
        <PrecoSection pack={pack} />
        <VendorInviteSection />
        <FaqSection />
        <FechoSection pack={pack} />
      </main>

      <footer
        className="border-t border-linha bg-bg text-ink"
        style={toVariables(darkTokens) as CSSProperties}
      >
        <div
          className={cn(
            "mx-auto grid max-w-[78rem] gap-10 pb-10 pt-16 md:grid-cols-[1.5fr_1fr_1fr_1fr]",
            SIDE_PADDING,
          )}
        >
          <div className="rodape-marca">
            <AnimatedBrand />
            <p className="max-w-[30ch] text-ink-2">
              A festa por quem viveu.
              <br />
              As lembranças em um só lugar.
            </p>
            <LandingCtaLink
              href={HREF_CRIAR_GRATIS}
              packHint={pack.id}
              className="mt-3 inline-block text-acento-texto no-underline"
            >
              Experimente seu álbum →
            </LandingCtaLink>
          </div>

          <nav className="rodape-coluna" aria-label="Conheça o Albora">
            <strong>Conheça</strong>
            <a href="#demo">Como funciona</a>
            <a href="#telao">O telão</a>
            <a href="#preco">Planos e preços</a>
            <a href={HREF_FORNECEDORES}>Para fornecedores</a>
          </nav>

          <nav className="rodape-coluna" aria-label="Ajuda e informações">
            <strong>Antes da festa</strong>
            <a href="#faq">Perguntas frequentes</a>
            <LandingDemoLink href={HREF_DEMO} packHint={pack.id}>
              Testar a demonstração
            </LandingDemoLink>
          </nav>

          <div className="rodape-coluna">
            <strong>Feito para reunir</strong>
            <p className="max-w-[26ch] text-ink-2">
              Casamentos, aniversários e encontros que merecem ser vistos por
              mais de um olhar.
            </p>
          </div>
        </div>

        <div className={cn("mx-auto flex max-w-[78rem] flex-wrap justify-between gap-3 border-t border-linha py-5 text-sm text-ink-3", SIDE_PADDING)}>
          <span>© {new Date().getFullYear()} Albora</span>
          <span>Álbum coletivo de fotos</span>
          <a href="#conteudo" className="text-ink-3 no-underline">
            Voltar ao topo ↑
          </a>
        </div>
      </footer>
    </div>
  );
}
