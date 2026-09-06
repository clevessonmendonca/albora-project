import type { Pack } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import type { CSSProperties } from "react";
import { LandingCtaLink } from "../landing-cta-link";
import { Heading, lightPillClasses } from "../pieces";
import { HREF_CRIAR_GRATIS } from "../landing-data";

export function FechoSection({ pack }: { pack: Pack }) {
  const dark = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "dark" },
  });

  return (
    <section
      className="bg-bg text-ink"
      style={toVariables(dark) as CSSProperties}
    >
      <div className="mx-auto max-w-[78rem] px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(4.5rem,9vw,7rem)] text-center">
        <Heading size="clamp(2rem,5vw,3.75rem)">
          Todos os momentos. Um só lugar.
        </Heading>
        <p
          className="tipo-display mx-auto mt-5 mb-8 italic text-acento-texto"
          style={{ fontSize: "clamp(1.125rem,2.6vw,1.625rem)" }}
        >
          Tiradas por quem viveu. Guardadas pra sempre.
        </p>
        <LandingCtaLink
          href={HREF_CRIAR_GRATIS}
          packHint={pack.id}
          className={lightPillClasses}
        >
          Criar meu evento
        </LandingCtaLink>
        <p className="mt-9 text-sm text-ink-3">
          Feito no Brasil · O convidado nunca digita senha, nunca recebe
          e-mail
        </p>
      </div>
    </section>
  );
}
