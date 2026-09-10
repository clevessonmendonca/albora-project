import type { Pack } from "@albora/packs";
import { LandingCtaLink } from "../landing-cta-link";
import { Section, Heading, Accent, pillClasses, lightPillClasses } from "../pieces";
import { HREF_CRIAR_GRATIS, HREF_CRIAR_COMPLETO } from "../landing-data";

type Plan = {
  name: string;
  price: string;
  description: string;
  features: string[];
  href: string;
  featured?: boolean;
  cta: string;
};

function PlanCard({ plan, packId }: { plan: Plan; packId: Pack["id"] }) {
  const buttonClass = plan.featured ? pillClasses : lightPillClasses;
  return (
    <article className={`plano-card ${plan.featured ? "plano-card-destaque" : ""}`}>
      {plan.featured ? <span className="plano-badge">Mais escolhido</span> : null}
      <h3 className="tipo-display m-0 text-[1.5rem]">{plan.name}</h3>
      <p className="m-0 mt-2 text-sm text-ink-2">{plan.description}</p>
      <p className="tipo-display m-0 mt-6 text-[2.25rem]">{plan.price}</p>
      <ul className="plano-lista">
        {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
      </ul>
      <LandingCtaLink href={plan.href} packHint={packId} className={`${buttonClass} mt-auto justify-center`}>
        {plan.cta}
      </LandingCtaLink>
    </article>
  );
}

export function PrecoSection({ pack }: { pack: Pack }) {
  return (
    <Section
      id="preco"
      reveal
      className="bg-superficie py-[clamp(3.5rem,7vw,5.25rem)] px-[clamp(1.125rem,4vw,2.75rem)]"
    >
      <p className="tipo-label uppercase text-acento-texto">Preço</p>
      <Heading size="clamp(1.75rem,3.6vw,2.75rem)">
        Comece grátis. <Accent>Pague uma vez, só se quiser tudo.</Accent>
      </Heading>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <PlanCard packId={pack.id} plan={{
          name: "Grátis",
          price: "R$ 0",
          description: "Para reunir as fotos da sua festa sem pagar nada.",
          features: ["QR Code e álbum coletivo", "Fotos dos convidados", "Feed ao vivo", "Comece em 3 minutos"],
          href: HREF_CRIAR_GRATIS,
          cta: "Começar grátis",
        }} />
        <PlanCard packId={pack.id} plan={{
          name: "Celebração",
          price: "R$ 199",
          description: "Tudo para transformar as fotos em parte da festa.",
          features: ["Tudo do plano grátis", "Telão com fotos ao vivo", "Missões e confessionário", "Exportação para sua nuvem"],
          href: HREF_CRIAR_COMPLETO,
          featured: true,
          cta: "Escolher Celebração",
        }} />
      </div>
      <p className="m-0 mt-6 text-sm text-ink-3">Pagamento único por evento. Sem mensalidade e sem cartão para começar.</p>
    </Section>
  );
}
