import Image from "next/image";
import { Section, Heading, Accent } from "../pieces";

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
      <div className="grid items-center gap-[clamp(2rem,5vw,3.5rem)] md:grid-cols-2">
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
          <Heading size="clamp(1.875rem,4vw,3rem)">
            No outro dia, <Accent>reviva o que não viu.</Accent>
          </Heading>
          <p className="mt-5 max-w-[34ch] text-[1.0625rem] leading-relaxed text-ink-2">
            Os bastidores, os abraços e as fotos fora de pose. Reunidos no
            álbum, para você rever e escolher o que quer guardar.
          </p>
          <a
            href="#preco"
            className="mt-6 inline-flex items-center gap-1 font-medium text-acento-texto underline-offset-4 hover:underline"
          >
            Escolher meu plano →
          </a>
        </div>
      </div>
    </Section>
  );
}
