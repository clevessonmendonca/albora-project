import { WEDDING, landingProblems } from "@albora/packs";
import type { Metadata } from "next";
import { LandingPage } from "./landing/landing-page";

export const metadata: Metadata = {
  title: "Albora — o álbum coletivo da sua festa",
  description: "As fotos que os seus convidados tiraram, reunidas num álbum só.",
  openGraph: {
    title: "Albora — o álbum coletivo da sua festa",
    description: "As fotos que os seus convidados tiraram, reunidas num álbum só.",
    images: [
      {
        url: "/landing/hero.webp",
        width: 1200,
        height: 630,
        alt: "Albora — o álbum coletivo da sua festa",
      },
    ],
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Albora",
  applicationCategory: "PhotographyApplication",
  operatingSystem: "Web, iOS, Android",
  description: "As fotos que os seus convidados tiraram, reunidas num álbum só.",
  url: "https://albora.com.br",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
};

export default function Home() {
  // Chave faltando vira a própria chave em corpo 74px na frente de quem ia
  // pagar. Falhar no build é barato; falhar na landing não é.
  const problemas = landingProblems(WEDDING);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingPage pack={WEDDING} />
    </>
  );
}
