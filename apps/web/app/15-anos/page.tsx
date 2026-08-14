import { FIFTEEN_YEARS, landingProblems } from "@albora/packs";
import type { Metadata } from "next";
import { PaginaLanding } from "../landing/pagina-landing";

export const metadata: Metadata = {
  title: "Albora — o álbum coletivo da sua festa de 15 anos",
  description: "As fotos que os seus convidados tiraram, reunidas num álbum só.",
};

/**
 * O mesmo componente, outro pack. É a verificação 6 da spec 013 executável
 * como rota: se algo aqui precisar divergir da rota `/`, o vocabulário deixou
 * de dar conta e a diferença virou código.
 */
export default function QuinzeAnos() {
  const problemas = landingProblems(FIFTEEN_YEARS);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  return <PaginaLanding pack={FIFTEEN_YEARS} />;
}
