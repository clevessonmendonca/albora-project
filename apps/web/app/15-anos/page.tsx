import { FIFTEEN_YEARS, landingProblems } from "@albora/packs";
import type { Metadata } from "next";
import { LandingPage } from "../landing/landing-page";

export const metadata: Metadata = {
  title: "Albora — o álbum coletivo da sua festa de 15 anos",
  description: "As fotos que os seus convidados tiraram, reunidas num álbum só.",
};

/** Spec 013, verificação 6 — se divergir da rota `/`, o vocabulário deixou de dar conta e a diferença virou código. */
export default function FifteenYearsPage() {
  const problemas = landingProblems(FIFTEEN_YEARS);
  if (problemas.length > 0) throw new Error(problemas.join("; "));

  return <LandingPage pack={FIFTEEN_YEARS} />;
}
