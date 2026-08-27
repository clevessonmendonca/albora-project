import { IDENTITY_MODELS } from "@albora/tokens";
import { cn } from "@albora/ui-web";
import { LandingCtaLink } from "../landing-cta-link";
import { Heading, Section, pillClasses, lightPillClasses } from "../pieces";
import {
  HREF_CRIAR_GRATIS,
  HREF_CRIAR_COMPLETO,
  HREF_FORNECEDOR,
} from "../landing-data";

export function PricingSection({
  packId,
  t,
}: {
  packId: string;
  t: (key: string) => string;
}) {
  const plans = [
    {
      name: "Grátis",
      price: "R$ 0",
      period: "para sempre",
      items: [
        "Convidados e fotos sem limite",
        "Missões e galeria",
        "Resolução reduzida",
        "Álbum por 30 dias",
      ],
      cta: "Criar álbum grátis",
      href: HREF_CRIAR_GRATIS,
      featured: false,
    },
    {
      name: `${t("landing.plano.completo")} · o mais escolhido`,
      price: "R$ 199",
      period: "pagamento único",
      items: [
        "Resolução original e vídeo",
        `Telão ao vivo nos ${IDENTITY_MODELS.length} modelos`,
        "Download em ZIP",
        "Identidade do evento aplicada",
        "12 meses, com exportação para a sua nuvem",
      ],
      cta: t("landing.cta"),
      href: HREF_CRIAR_COMPLETO,
      featured: true,
    },
    {
      name: "Fornecedor",
      price: "Sob consulta",
      period: "white-label",
      items: [
        "Eventos sem limite, com a sua marca",
        "Um painel para a sua carteira",
        "Zero operação no dia da festa",
      ],
      cta: "Falar com a gente",
      href: HREF_FORNECEDOR,
      featured: false,
    },
  ];

  return (
    <Section id="planos" reveal>
      <Heading
        size="clamp(1.75rem, 4.2vw, 3.25rem)"
        className="mb-[clamp(1.625rem,3.5vw,2.875rem)] max-w-[41.25rem]"
      >
        {t("landing.planos.titulo")}
      </Heading>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))] gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "cartao flex flex-col gap-5 rounded-superficie p-8",
              plan.featured ? "bg-gradient-chao-quente" : "bg-superficie-alta",
            )}
          >
            <div>
              <p
                className={cn(
                  "m-0 mb-3 text-[0.84375rem] font-semibold",
                  plan.featured ? "text-acento-texto" : "text-ink-2",
                )}
              >
                {plan.name}
              </p>
              <p className="m-0 font-titulo text-[2.5rem] font-light tabular-nums tracking-titulo">
                {plan.price}
                <span className="mt-1.5 block font-corpo text-[0.84375rem] text-ink-2">
                  {plan.period}
                </span>
              </p>
            </div>

            <ul className="m-0 flex flex-1 list-none flex-col gap-2.5 p-0 text-ink-2">
              {plan.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>

            {plan.href === HREF_FORNECEDOR ? (
              <a
                href={plan.href}
                className={cn(
                  plan.featured ? pillClasses : lightPillClasses,
                  !plan.featured && "bg-acento-superficie-suave",
                  "py-3.5 text-[0.90625rem]",
                )}
              >
                {plan.cta}
              </a>
            ) : (
              <LandingCtaLink
                href={plan.href}
                packHint={packId}
                className={cn(
                  plan.featured ? pillClasses : lightPillClasses,
                  !plan.featured && "bg-acento-superficie-suave",
                  "py-3.5 text-[0.90625rem]",
                )}
              >
                {plan.cta}
              </LandingCtaLink>
            )}
          </div>
        ))}
      </div>

      <p className="m-0 mt-5 text-ink-3">
        Nada é cobrado depois da festa. A decisão acontece antes de imprimir o
        QR.
      </p>
    </Section>
  );
}
