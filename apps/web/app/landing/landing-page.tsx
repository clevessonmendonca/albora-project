import "./landing.css";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { resolvePackText, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import type { CSSProperties } from "react";
import { AnimatedBrand } from "./animated-brand";
import { LandingBeacon } from "./landing-beacon";
import { LandingCtaLink } from "./landing-cta-link";
import { pillClasses } from "./pieces";
import { SIDE_PADDING, HREF_CRIAR_GRATIS, type LiveStats } from "./landing-data";
import {
  HeroSection,
  ProvaSection,
  ComoFuncionaSection,
  PerspectivasSection,
  TelaoSection,
  DuranteAFestaSection,
  DepoisSection,
  ObjecoesSection,
  PrecoSection,
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
      className="landing-page min-h-screen bg-bg font-corpo leading-normal text-ink"
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
          <a href="/fornecedores" className="elo text-inherit no-underline">
            Para fornecedores
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

      <HeroSection pack={pack} {...(live !== undefined ? { live } : {})} />
      <ProvaSection />
      <span id="demo" className="anchor-target" aria-hidden="true" />
      <ComoFuncionaSection />
      <PerspectivasSection pack={pack} />
      <TelaoSection pack={pack} />
      <DuranteAFestaSection />
      <DepoisSection />
      <ObjecoesSection />
      <PrecoSection pack={pack} />
      <FaqSection />
      <span id="perguntas" className="anchor-target" aria-hidden="true" />
      <FechoSection pack={pack} />

      <footer className="rodape border-t border-linha bg-bg">
        <div className={cn("rodape-grid mx-auto max-w-[78rem] py-14", SIDE_PADDING)}>
          <div className="rodape-marca">
            <AnimatedBrand />
            <p>As fotos da festa, reunidas por quem viveu ela.</p>
          </div>
          <div className="rodape-coluna">
            <strong>Conheça</strong>
            <a href="#como">Como funciona</a>
            <a href="#telao">O telão</a>
            <a href="#preco">Planos e preços</a>
            <a href="/fornecedores">Para fornecedores</a>
          </div>
          <div className="rodape-coluna">
            <strong>Ajuda</strong>
            <a href="#faq">Perguntas frequentes</a>
            <a href={HREF_CRIAR_GRATIS}>Criar meu evento</a>
            <a href="/privacidade">Privacidade</a>
            <a href="mailto:oi@albora.com.br">Fale com a gente</a>
          </div>
        </div>
        <div className={cn("rodape-base mx-auto max-w-[78rem] py-5 text-sm", SIDE_PADDING)}>
          <span>© {new Date().getFullYear()} Albora · Feito no Brasil</span>
          <span>Momentos melhores quando todo mundo participa.</span>
        </div>
      </footer>
    </div>
  );
}
