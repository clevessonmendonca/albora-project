import Image from "next/image";
import { Reveal } from "../interactives";
import { Accent, Heading, Label, Section, radiusStyle } from "../pieces";
import { SURFACES } from "../landing-data";

export function MomentsSection({
  t,
}: {
  t: (key: string) => string;
}) {
  return (
    <Section id="momentos" reveal>
      <Label>Durante e depois da festa</Label>
      <Heading size="clamp(1.875rem, 4.4vw, 3.5rem)">
        {t("landing.momentos.titulo")}{" "}
        <Accent>{t("landing.momentos.destaque")}</Accent>
      </Heading>
      <p className="m-0 mt-6 max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
        {t("landing.momentos.lede")}
      </p>

      <div
        className="relative mt-[clamp(2.5rem,6vw,4.25rem)] h-[clamp(18rem,40vw,32rem)] overflow-hidden rounded-superficie shadow-alta"
        style={radiusStyle("var(--raio-superficie)")}
      >
        <Image
          src="/landing/dancefloor.webp"
          alt="Pista de dança vista de cima, com luzes e convidados dançando"
          fill
          sizes="(min-width: 78rem) 1248px, 100vw"
          className="object-cover"
        />
      </div>

      <div className="mt-[clamp(2.25rem,5vw,3.75rem)] grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-[clamp(1.25rem,3vw,2.75rem)]">
        {SURFACES.map((s, i) => (
          <Reveal key={s.label} delay={i * 80}>
            <div className="border-t border-linha py-5">
              <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
                {s.label}
              </p>
              <p className="m-0 mt-2 text-sm leading-normal text-ink-2">
                {s.caption}
              </p>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
