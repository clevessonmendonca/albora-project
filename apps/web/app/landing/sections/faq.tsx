import { cn } from "@albora/ui-web";
import { Section } from "../pieces";
import { QUESTIONS, SIDE_PADDING } from "../landing-data";

export function FaqSection() {
  return (
    <Section
      className={`pb-[clamp(3.5rem,8vw,6.875rem)] pt-0 ${SIDE_PADDING}`}
    >
      <div className="max-w-[58.75rem]">
        {QUESTIONS.map((p, i) => (
          <div
            key={p.q}
            className={cn(
              "pergunta grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-[clamp(1.125rem,4vw,3.25rem)] border-t border-linha py-[1.625rem]",
              i === QUESTIONS.length - 1 && "border-b",
            )}
          >
            <h3 className="m-0 font-titulo text-[clamp(1.125rem,2vw,1.4375rem)] font-normal leading-[1.25]">
              {p.q}
            </h3>
            <p className="m-0 leading-[1.65] text-ink-2">{p.a}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
