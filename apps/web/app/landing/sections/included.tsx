import { Heading, Label, Section } from "../pieces";
import { FACTS } from "../landing-data";

export function IncludedSection() {
  return (
    <Section reveal>
      <div className="rounded-superficie bg-acento-superficie-suave p-[clamp(1.75rem,4vw,3.75rem)]">
        <Label>O que está incluído</Label>
        <Heading
          size="clamp(1.75rem, 3.6vw, 2.75rem)"
          className="max-w-[24ch]"
        >
          Antes de falar de preço, o que você leva.
        </Heading>

        <ul className="m-0 mt-[clamp(1.5rem,3vw,2.375rem)] grid list-none grid-cols-[repeat(auto-fit,minmax(19rem,1fr))] gap-x-[clamp(1.5rem,4vw,3.5rem)] gap-y-1 p-0">
          {FACTS.map((fact) => (
            <li
              key={fact}
              className="flex items-baseline gap-[0.875rem] border-b border-linha py-[0.9375rem] leading-normal text-ink-2"
            >
              <span className="shrink-0 text-acento-texto" aria-hidden="true">
                ✓
              </span>
              {fact}
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
