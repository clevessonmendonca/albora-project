import Image from "next/image";
import { Section, Heading, Accent, Label } from "../pieces";

const FOTOS = [
  { src: "05-album-livro-produto", alt: "Álbum impresso do Albora" },
  { src: "06-casal-revendo-album", alt: "Casal revendo o álbum" },
  { src: "02-perspectivas", alt: "Convidados na festa" },
  { src: "08-telao-com-casal", alt: "O casal diante do telão" },
  { src: "09-amigos-na-mesa", alt: "Amigos na mesa" },
  { src: "07-pista-de-danca", alt: "A pista de dança" },
] as const;

export function DepoisSection() {
  return (
    <Section reveal>
      <div className="grid items-center gap-[clamp(2rem,5vw,3.5rem)] lg:grid-cols-2">
        <div className="memoria-carrossel" aria-label="Fotos de exemplo do álbum">
          <div className="memoria-carrossel-faixa">
            {[...FOTOS, ...FOTOS].map((foto, index) => (
              <div className="memoria-foto" key={`${foto.src}-${index}`}>
                <Image
                  src={`/landing/gen/${foto.src}.png`}
                  alt={index >= FOTOS.length ? "" : foto.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 760px) 24vw, 110px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Depois</Label>
          <Heading size="clamp(1.875rem,4vw,3rem)">
            No dia seguinte, <Accent>já está tudo organizado.</Accent>
          </Heading>
          <p className="mt-5 max-w-[34ch] text-[1.0625rem] leading-relaxed text-ink-2">
            As fotos entram por momento e ficam prontas para revisar, baixar e
            guardar. Se quiser, você também pode transformar a seleção em um
            livro impresso.
          </p>
        </div>
      </div>
    </Section>
  );
}
