import { Heading, Label, Section, radiusStyle } from "../pieces";

export function BookSection({ places }: { places: string[] }) {
  return (
    <Section id="livro" reveal>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(18.75rem,1fr))] items-center gap-[clamp(1.75rem,4vw,4.5rem)]">
        <div className="overflow-hidden rounded-superficie shadow-alta">
          <img
            src="/landing/album.webp"
            alt="Álbum de fotos aberto sobre mesa de madeira"
            loading="lazy"
            decoding="async"
            className="block w-full object-cover"
            style={radiusStyle("var(--raio-superficie)")}
          />
        </div>
        <div>
          <Label>Depois da festa</Label>
          <Heading size="clamp(1.75rem, 4vw, 3.125rem)">
            O outro álbum da sua festa.
          </Heading>
          <p className="m-0 mt-6 max-w-[28.75rem] text-[1.0625rem] leading-normal text-ink-2">
            Bastidores, ângulos que ninguém cobriu, a pista às 2h. Você encaixa
            cada foto no seu espaço e o arquivo sai pronto para a gráfica, no
            mesmo desenho da placa e do telão, sem precisar de designer.
          </p>

          <p className="m-0 mb-3 mt-[1.375rem] text-ink-2">
            E já chega separado por onde cada foto foi tirada:
          </p>
          <div className="flex flex-wrap gap-2">
            {places.map((place) => (
              <span
                key={place}
                className="rounded-pilula bg-superficie-alta px-[0.9375rem] py-[0.4375rem] text-[0.84375rem] text-ink-2"
              >
                {place}
              </span>
            ))}
          </div>

          <p className="m-0 mt-[1.375rem] text-ink-3">
            Montar é grátis. O arquivo é seu.
          </p>
        </div>
      </div>
    </Section>
  );
}
