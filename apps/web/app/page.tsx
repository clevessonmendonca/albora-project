import { WEDDING, landingProblems } from "@albora/packs";
import type { Metadata } from "next";
import { PaginaLanding } from "./landing/pagina-landing";

export const metadata: Metadata = {
  title: "Albora — o álbum coletivo da sua festa",
  description: "As fotos que os seus convidados tiraram, reunidas num álbum só.",
};

export default function Home() {
  // Chave faltando vira a própria chave em corpo 74px na frente de quem ia
  // pagar. Falhar no build é barato; falhar na landing não é.
  const problemas = landingProblems(WEDDING);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  return <PaginaLanding pack={WEDDING} />;
}
