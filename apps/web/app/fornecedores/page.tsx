import type { Metadata } from "next";
import { VendorLanding } from "@/features/vendor-marketing/components/vendor-landing";

export const metadata: Metadata = {
  title: "Albora para fornecedores de eventos",
  description:
    "Crie experiências digitais para festas, reúna as fotos dos convidados e entregue um álbum completo com a sua marca.",
  openGraph: {
    title: "Albora para fornecedores de eventos",
    description:
      "QR, fotos dos convidados, telão e álbum em uma operação simples para sua equipe.",
    images: [
      {
        url: "/fornecedores/pista-multigeracional.webp",
        width: 1200,
        height: 800,
        alt: "Convidados celebrando juntos durante uma festa",
      },
    ],
  },
};

export default function FornecedoresPage() {
  return <VendorLanding />;
}
