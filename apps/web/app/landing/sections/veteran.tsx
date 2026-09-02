import { cn } from "@albora/ui-web";
import { LandingVeteranCtaLink } from "../landing-veteran-cta";
import { Heading, Section, pillClasses } from "../pieces";
import { HREF_CRIAR_ALBUM } from "../landing-data";

export function VeteranSection({
  packId,
  t,
}: {
  packId: string;
  t: (key: string) => string;
}) {
  return (
    <Section reveal className="pt-0">
      <div
        className={cn(
          "rounded-superficie border border-linha bg-superficie-alta",
          "px-[clamp(1.5rem,4vw,2.75rem)] py-[clamp(1.75rem,4vw,2.75rem)]",
          "text-center",
        )}
      >
        <Heading size="clamp(1.375rem, 3vw, 2rem)" className="mx-auto max-w-[28ch]">
          {t("landing.veteran.titulo")}
        </Heading>
        <p className="mx-auto mt-3 mb-0 max-w-[36ch] text-[1.0625rem] leading-[1.55] text-ink-2">
          {t("landing.veteran.lede")}
        </p>
        <LandingVeteranCtaLink
          href={HREF_CRIAR_ALBUM}
          packHint={packId}
          className={cn(pillClasses, "mt-6")}
        >
          Criar meu álbum
        </LandingVeteranCtaLink>
      </div>
    </Section>
  );
}
