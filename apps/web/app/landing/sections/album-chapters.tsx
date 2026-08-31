import { Timeline, NightSlot } from "../showcases";
import { Accent, Heading, Label, Section } from "../pieces";

export function AlbumChaptersSection({
  eventMoments,
}: {
  eventMoments: { id: string; title: string; desc: string }[];
}) {
  return (
    <Section id="album" reveal>
      <Label>O álbum, durante a festa</Label>
      <Heading size="clamp(1.875rem, 4.4vw, 3.5rem)">
        Todos os momentos, cada um <Accent>no seu capítulo.</Accent>
      </Heading>
      <p className="m-0 mt-6 mb-[clamp(2rem,4vw,3.25rem)] max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
        Cada foto chega sabendo a hora e o lugar em que foi tirada. É por isso
        que o álbum já nasce dividido nos momentos da festa, sem ninguém separar
        nada depois.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))] gap-[clamp(0.875rem,2vw,1.5rem)]">
        {eventMoments.map((m, i) => (
          <figure
            key={m.id}
            className="cartao m-0 overflow-hidden rounded-superficie"
          >
            <NightSlot variant={i} ratio="4 / 5" />
            <figcaption className="bg-superficie-alta px-[1.125rem] pb-5 pt-[1.0625rem]">
              <span className="block font-titulo text-[1.0625rem] leading-[1.2] tracking-titulo">
                {m.title}
              </span>
              <span className="mt-[0.4375rem] block text-[0.8125rem] leading-[1.45] text-ink-2">
                {m.desc}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>

      <p className="m-0 mt-[clamp(2.5rem,5vw,4rem)] mb-[clamp(0.5rem,1.5vw,1rem)] text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
        E dentro de cada capítulo, na ordem da noite
      </p>

      <Timeline />
    </Section>
  );
}
