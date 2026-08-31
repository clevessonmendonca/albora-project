import { Label, Heading, Section, radiusStyle } from "../pieces";
import { STEPS, NUMBERS } from "../landing-data";

export function ExperienceSection() {
  return (
    <Section id="experiencia" reveal>
      <div className="rounded-superficie bg-acento-superficie-suave p-[clamp(1.75rem,4vw,3.75rem)]">
        <div
          className="mb-[clamp(1.5rem,3vw,2.5rem)] overflow-hidden"
          style={radiusStyle("var(--raio)")}
        >
          <img
            src="/landing/guest.webp"
            alt="Convidada fotografando com o celular durante a festa"
            loading="lazy"
            decoding="async"
            className="block h-[clamp(12rem,26vw,20rem)] w-full object-cover object-top"
            style={radiusStyle("var(--raio)")}
          />
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(17.5rem,1fr))] items-center gap-[clamp(1.5rem,4vw,3.5rem)]">
          <div className="max-w-[26.25rem]">
            <Label>A experiência do convidado</Label>
            <Heading size="clamp(1.75rem, 3.6vw, 2.75rem)" className="mb-4">
              Três passos até a primeira foto.
            </Heading>

            <p className="m-0 mb-[1.375rem] max-w-[34ch] leading-normal text-ink-2">
              Uma leitura de QR e a foto já está no álbum. Sem cadastro, sem
              senha e sem baixar nada até a primeira.
            </p>

            {STEPS.map((p, i) => (
              <div
                key={p.title}
                className="flex items-start gap-[1.125rem] border-t border-linha py-5"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alta font-titulo text-acento-texto">
                  {i + 1}
                </span>
                <span>
                  <span className="block">{p.title}</span>
                  <span className="mt-[0.3125rem] block text-[0.84375rem] leading-normal text-ink-2">
                    {p.desc}
                  </span>
                </span>
              </div>
            ))}

            <a
              href="#demo"
              className="elo mt-5 inline-block text-acento-texto"
            >
              Ver a experiência acontecendo
            </a>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(9.375rem,1fr))] gap-[0.875rem]">
            {NUMBERS.map((x) => (
              <div
                key={x.o}
                className="cartao rounded-superficie bg-superficie-alta p-6"
              >
                <p className="m-0 font-titulo text-[clamp(1.875rem,3.4vw,2.625rem)] font-light tabular-nums leading-none tracking-titulo text-acento-texto">
                  {x.n}
                </p>
                <p className="m-0 mt-3 leading-normal text-ink-2">{x.o}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}
