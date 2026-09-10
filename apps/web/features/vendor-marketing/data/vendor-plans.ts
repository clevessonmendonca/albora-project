import { VENDOR_PLAN_PRICE_CENTS, type VendorPlanTier } from "@albora/core";

export type VendorPlanContent = {
  id: VendorPlanTier;
  name: string;
  audience: string;
  benefits: readonly string[];
  featured?: boolean;
};

export const VENDOR_PLANS: readonly VendorPlanContent[] = [
  {
    id: "starter",
    name: "Starter",
    audience: "Para validar a oferta com uma operação pequena.",
    benefits: [
      "Até 3 eventos ativos",
      "Experiência completa para os convidados",
      "Álbum e exportação básica",
      "1 pessoa na operação",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    audience: "Para quem já entrega eventos todos os meses.",
    benefits: [
      "Eventos ativos sem limite",
      "Identidade visual do seu estúdio",
      "Até 5 pessoas na equipe",
      "Insights e exportações avançadas",
    ],
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    audience: "Para equipes maiores e operações white-label.",
    benefits: [
      "Tudo do Studio",
      "Experiência sem selo Albora",
      "Papéis e permissões avançados",
      "Operação para múltiplas marcas",
    ],
  },
] as const;

const CURRENCY = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export function vendorPlanPrice(plan: VendorPlanTier): string {
  return CURRENCY.format(VENDOR_PLAN_PRICE_CENTS[plan] / 100);
}
