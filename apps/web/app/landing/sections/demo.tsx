import Image from "next/image";
import { HREF_CRIAR_GRATIS } from "../landing-data";
import { LandingCtaLink } from "../landing-cta-link";
import { Accent, Heading, Label, lightPillClasses, Section } from "../pieces";

const DEMO_PHOTOS = [
  ["/landing/gen/09-amigos-na-mesa.png", "Amigos na mesa"],
  ["/landing/gen/06-casal-revendo-album.png", "Casal revendo o álbum"],
  ["/landing/gen/07-pista-de-danca.png", "Convidados na pista"],
] as const;

export function DemoSection({ packId }: { packId: string }) {
  return (
    <Section id="demo" reveal className="bg-superficie px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(4rem,8vw,6.5rem)]">
      <div className="grid items-center gap-[clamp(2rem,6vw,5rem)] lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <Label>Veja antes da festa</Label>
          <Heading size="clamp(2rem,4.5vw,3.5rem)">Do celular deles. <Accent>Para o seu álbum.</Accent></Heading>
          <p className="mt-6 max-w-[38ch] text-[1.05rem] leading-relaxed text-ink-2">Compartilhe um QR Code, receba as fotos e acompanhe tudo enquanto a festa acontece. Você pode começar agora e personalizar o evento em poucos minutos.</p>
          <ol className="m-0 mt-8 flex list-none flex-col gap-4 p-0 text-ink-2">
            <li><b className="mr-3 text-acento-texto">01</b>Crie o evento e escolha o estilo.</li>
            <li><b className="mr-3 text-acento-texto">02</b>Compartilhe o QR Code nas mesas.</li>
            <li><b className="mr-3 text-acento-texto">03</b>Reúna as fotos no álbum coletivo.</li>
          </ol>
          <LandingCtaLink href={HREF_CRIAR_GRATIS} packHint={packId} className={`${lightPillClasses} mt-8`}>Testar meu álbum →</LandingCtaLink>
        </div>
        <div className="demo-album" role="group" aria-label="Prévia de um álbum coletivo">
          <div className="demo-album-top"><span>Álbum de exemplo</span><span>3 fotos</span></div>
          <h3 className="tipo-display m-0 text-[clamp(1.5rem,3vw,2.25rem)]">Ana &amp; Léo</h3>
          <p className="m-0 mt-1 text-sm text-ink-3">Um dia. Muitos olhares.</p>
          <div className="demo-album-grid">
            {DEMO_PHOTOS.map(([src, alt]) => <div className="relative aspect-[4/5] overflow-hidden" key={src}><Image src={src} alt={alt} fill sizes="(max-width: 760px) 28vw, 220px" className="object-cover" /></div>)}
          </div>
        </div>
      </div>
    </Section>
  );
}
