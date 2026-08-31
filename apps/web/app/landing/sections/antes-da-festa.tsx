import { PACKS, resolvePackText } from "@albora/packs";
import { cn } from "@albora/ui-web";
import { LandingCtaLink } from "../landing-cta-link";
import { HREF_CRIAR_GRATIS } from "../landing-data";
import { Heading, Label, Section, lightPillClasses } from "../pieces";

/** Só os identificadores moram aqui; todo texto sai do pack. */
const OCASIOES = ["noivado", "cha", "despedida", "ensaio"] as const;

/**
 * Existe porque o produto só tinha motivo de existir na noite da festa, e o
 * anfitrião decide isso no fim do planejamento — quando o orçamento acabou e a
 * atenção também. Quem chega por último é comparado com o mais barato parecido.
 *
 * Qual pack tem festas anteriores é decisão do pack (`sugereAntes`), não deste
 * componente: um pack sem elas simplesmente não declara, e a seção some.
 */
export function AntesDaFestaSection({ packId }: { packId: string }) {
  const antes = PACKS[packId]?.sugereAntes;
  const pack = antes ? PACKS[antes] : undefined;
  if (!pack) return null;

  return (
    <Section reveal>
      <Label>{resolvePackText(pack, "sugestao.rotulo")}</Label>
      <Heading size="clamp(1.75rem, 4vw, 3rem)" className="max-w-[24ch]">
        {resolvePackText(pack, "sugestao.chamada")}
      </Heading>
      <p className="m-0 mt-6 max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
        {resolvePackText(pack, "sugestao.lede")}
      </p>

      <ul className="m-0 mt-[clamp(1.75rem,3.5vw,2.5rem)] grid list-none grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-3 p-0">
        {OCASIOES.map((id) => (
          <li
            key={id}
            className={cn(
              "rounded-superficie border border-linha bg-superficie-alta",
              "px-5 py-4",
            )}
          >
            <p className="m-0 font-titulo text-[1.0625rem] text-ink">
              {resolvePackText(pack, `ocasiao.${id}`)}
            </p>
            <p className="m-0 mt-1 text-[0.84375rem] text-ink-3">
              {resolvePackText(pack, `ocasiao.${id}.quando`)}
            </p>
          </li>
        ))}
      </ul>

      <p className="m-0 mt-6 max-w-[44ch] text-[0.9375rem] leading-normal text-ink-2">
        {resolvePackText(pack, "sugestao.efeito")}
      </p>

      <LandingCtaLink
        href={HREF_CRIAR_GRATIS}
        packHint={packId}
        className={cn(lightPillClasses, "mt-7 bg-acento-superficie-suave")}
      >
        {resolvePackText(pack, "sugestao.cta")}
      </LandingCtaLink>
    </Section>
  );
}
