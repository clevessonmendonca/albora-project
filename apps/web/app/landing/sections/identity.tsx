import { IdentityWall } from "../interactives";
import { Accent, Heading, Label, Section } from "../pieces";

export function IdentitySection({
  example,
  t,
}: {
  example: string;
  t: (key: string) => string;
}) {
  return (
    <Section id="identidade" reveal>
      <div className="mb-[clamp(1.5rem,3vw,2.375rem)] flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-[41.25rem]">
          <Label>A identidade do seu evento</Label>
          <Heading size="clamp(1.875rem, 4.4vw, 3.5rem)">
            Uma decisão de cor, e ela <Accent>aparece em tudo.</Accent>
          </Heading>
        </div>
        <p className="m-0 max-w-[20rem] leading-normal text-ink-2">
          {t("landing.telao.lede")}
        </p>
      </div>

      <IdentityWall example={example} />

      <p className="m-0 mt-[1.375rem] max-w-[44rem] text-ink-3">
        {t("landing.telao.titulo")} E se não tiver, nada se perde: a festa
        inteira acompanha pelo próprio celular, que é onde a maior parte das
        fotos é vista de qualquer jeito.
      </p>
    </Section>
  );
}
