import Image from "next/image";
import { Accent, Heading, Label, Section } from "../pieces";

export function DuranteAFestaSection() {
  return (
    <Section reveal>
      <div className="grid items-center gap-[clamp(2rem,5vw,3.5rem)] lg:grid-cols-2">
        <div>
          <Label>Durante a festa</Label>
          <Heading size="clamp(1.875rem,4vw,3rem)">
            Sua festa continua <Accent>acontecendo no Albora.</Accent>
          </Heading>
          <p className="mt-5 max-w-[34ch] text-[1.0625rem] leading-relaxed text-ink-2">
            O feed enche em tempo real, as missões dão o que fotografar, as
            reações aparecem na hora e cada convidado sai com a própria
            galeria. Não é uma lista de recursos — é a festa, viva, na palma
            da mão.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 [grid-auto-rows:7.5rem]">
          <div className="relative overflow-hidden border border-linha row-span-2">
            <Image
              src="/landing/gen/07-pista-de-danca.png"
              alt="Convidados dançando na pista"
              fill
              loading="lazy"
              sizes="(max-width:760px) 45vw, 260px"
              className="object-cover"
            />
          </div>
          <div className="relative overflow-hidden border border-linha">
            <Image
              src="/landing/gen/09-amigos-na-mesa.png"
              alt="Amigos brindando na mesa"
              fill
              loading="lazy"
              sizes="(max-width:760px) 45vw, 260px"
              className="object-cover"
            />
          </div>
          <div className="relative overflow-hidden border border-linha">
            <Image
              src="/landing/gen/04-convidada-usando-albora.png"
              alt="Convidada fotografando com o celular"
              fill
              loading="lazy"
              sizes="(max-width:760px) 45vw, 260px"
              className="object-cover"
            />
          </div>
          <div className="relative overflow-hidden border border-linha row-span-2">
            <Image
              src="/landing/gen/01-hero-festa.png"
              alt="Casal dançando cercado de convidados"
              fill
              loading="lazy"
              sizes="(max-width:760px) 45vw, 260px"
              className="object-cover"
            />
          </div>
          <div className="relative overflow-hidden border border-linha">
            <Image
              src="/landing/gen/06-casal-revendo-album.png"
              alt="Casal revendo as fotos"
              fill
              loading="lazy"
              sizes="(max-width:760px) 45vw, 260px"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </Section>
  );
}
