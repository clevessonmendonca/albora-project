import { resolvePackText, type Pack } from "@albora/packs";
import type { ReactNode } from "react";
import { LandingCtaLink } from "../landing-cta-link";
import { Heading, Accent, pillClasses, lightPillClasses } from "../pieces";
import { Reveal } from "../interactives";
import { HREF_CRIAR_GRATIS, HREF_CRIAR_COMPLETO, HREF_PACOTE } from "../landing-data";

type Plan = {
  name: string;
  price: ReactNode;
  description: string;
  features: string[];
  href: string;
  featured?: boolean;
  cta: string;
  micro: string;
};

function PlanCard({ plan, packId }: { plan: Plan; packId: Pack["id"] }) {
  const buttonClass = plan.featured ? pillClasses : lightPillClasses;
  return (
    <article className={`plano-card ${plan.featured ? "plano-card-destaque" : ""}`}>
      {plan.featured ? <span className="plano-badge">Mais escolhido</span> : null}
      <h3 className="tipo-display m-0 text-[1.5rem]">{plan.name}</h3>
      <p className="m-0 mt-2 text-sm text-ink-2">{plan.description}</p>
      <p className="plano-preco tipo-display m-0 mt-4">{plan.price}</p>
      <ul className="plano-lista">
        {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
      </ul>
      <LandingCtaLink href={plan.href} packHint={packId} className={`${buttonClass} mt-auto justify-center`}>
        {plan.cta}
      </LandingCtaLink>
      <p className="plano-micro">{plan.micro}</p>
    </article>
  );
}

export function PrecoSection({ pack }: { pack: Pack }) {
  return (
    <section id="preco" className="bg-superficie">
      <div className="mx-auto max-w-[78rem] px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(3.5rem,7vw,5.25rem)]">
        <Reveal>
      <p className="tipo-label uppercase text-acento-texto">Preço</p>
      <Heading size="clamp(1.75rem,3.6vw,2.75rem)">
        Comece grátis. <Accent>Faça a festa por R$ 59,90.</Accent>
      </Heading>
      <p className="mt-5 max-w-[52ch] text-[1.0625rem] leading-relaxed text-ink-2">
        Um álbum de verdade no Grátis. Telão, mais espaço e mais tempo no
        Completo. Você paga uma vez, sem mensalidade.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <PlanCard
          packId={pack.id}
          plan={{
            name: "Grátis",
            price: "R$ 0",
            description:
              "Para reunir as fotos de uma festa pequena ou conhecer com seus convidados.",
            features: [
              "Até 200 fotos, dentro de 1 GB",
              "Um evento ativo por vez",
              "QR Code e álbum com acesso por link",
              "7 dias para enviar fotos",
              "30 dias para ver e baixar",
              "Download de todas as fotos em ZIP",
            ],
            href: HREF_CRIAR_GRATIS,
            cta: "Experimentar grátis →",
            micro: "Sem cartão. Sem telão. Sem anúncios.",
          }}
        />
        <PlanCard
          packId={pack.id}
          plan={{
            name: "Completo",
            price: (
              <>
                R$ 59,90 <small className="text-sm font-normal text-ink-3">por evento</small>
              </>
            ),
            description:
              "Para ver a festa no telão e guardar os olhares de todo mundo.",
            features: [
              "10 GB para as fotos da sua festa",
              "QR Code e álbum com acesso por link",
              "Telão com o estilo da festa",
              "30 dias para enviar fotos",
              "6 meses para ver e baixar",
              "Download de todas as fotos em ZIP",
            ],
            href: HREF_CRIAR_COMPLETO,
            featured: true,
            cta: "Experimentar o Completo →",
            micro: "Pagamento único. Sem mensalidade ou anúncios.",
          }}
        />
      </div>

      <p className="m-0 mt-6 text-xs text-ink-3">
        Prazos a partir da data do evento, ou da criação se o evento já
        passou. A capacidade inclui as fotos armazenadas. TV ou projetor não
        incluídos.
      </p>
      <p className="m-0 mt-2 text-xs text-ink-3">
        Oferta proposta neste protótipo. A demonstração é gratuita e não
        realiza cobranças.
      </p>

      <div className="preco-pacote">
        <div>
          <h3 className="tipo-display m-0 text-[1.5rem]">
            Três festas. <Accent>Mais histórias para guardar.</Accent>
          </h3>
          <p className="mt-3 text-ink-2">
            {resolvePackText(pack, "landing.pacote.exemplos")} Leve{" "}
            <b>3 eventos completos por R$ 149,90</b>.
          </p>
          <p className="mt-2 text-xs text-ink-3">
            Economize R$ 29,80. Cada evento tem 10 GB, telão e 6 meses de
            galeria. Ative os créditos em até 12 meses; os prazos de cada
            álbum começam na data do respectivo evento, ou na criação se ele
            já passou.
          </p>
        </div>
        <LandingCtaLink
          href={HREF_PACOTE}
          packHint={pack.id}
          className={`preco-pacote-cta ${pillClasses}`}
        >
          Experimentar o pacote →
        </LandingCtaLink>
      </div>

      <details className="livro-info">
        <summary>
          <span>Posso guardar as fotos fora do Albora?</span>
          <span aria-hidden="true">+</span>
        </summary>
        <p>
          Sim. A proposta dos dois planos inclui baixar todas as fotos em ZIP.
          Salve uma cópia no seu computador ou na sua nuvem antes do fim do
          prazo da galeria.
        </p>
      </details>
        </Reveal>
      </div>
    </section>
  );
}
