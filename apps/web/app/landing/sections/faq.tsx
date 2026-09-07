import { Section, Heading } from "../pieces";

const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Quanto tempo leva pra montar?",
    a: "Cerca de três minutos: nome do evento, data e a identidade visual. O QR e as placas saem prontos pra impressão.",
  },
  {
    q: "Preciso de telão?",
    a: "Não. Sem telão, a festa acontece nos celulares e no feed. Com telão, ele veste o seu evento e mostra as fotos ao vivo.",
  },
  {
    q: "Serve pra 15 anos, aniversário, corporativo?",
    a: "Serve. O núcleo é o mesmo; o vocabulário e a identidade se ajustam ao tipo de festa.",
  },
];

export function FaqSection() {
  return (
    <Section reveal>
      <div className="grid gap-[clamp(1.5rem,4vw,3rem)] lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="tipo-label uppercase text-acento-texto">Perguntas</p>
          <Heading size="clamp(1.5rem,3vw,2.25rem)">
            O que ainda trava a decisão.
          </Heading>
        </div>
        <div className="border-t border-linha">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="border-b border-linha">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[1.125rem] font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-xl leading-none text-acento-texto">+</span>
              </summary>
              <p className="m-0 mb-[1.125rem] max-w-[64ch] text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
