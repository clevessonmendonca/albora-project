import "./landing.css";
import { ALBORA_BRAND, IDENTITY_MODELS, toVariables, resolveTokens } from "@albora/tokens";
import { resolvePackText, type Pack } from "@albora/packs";
import { cn } from "@albora/ui-web";
import type { CSSProperties } from "react";
import { ScrollDemo, Missions, Reveal, IdentityWall } from "./interactives";
import { OpenAlbum, PolaroidFan, Timeline, NightSlot } from "./showcases";
import { Brand } from "./brand";
import { AnimatedBrand } from "./animated-brand";
import { LandingBeacon, LandingCtaLink, LandingDemoLink } from "./landing-beacon";
import {
  Accent,
  Frame,
  Heading,
  Label,
  pillClasses,
  lightPillClasses,
  radiusStyle,
} from "./pieces";

/**
 * A landing (task 013), portada da v4 dos designers.
 *
 * Duas coisas mudam em relação ao arquivo original, e as duas são regra do
 * `CLAUDE.md`, não gosto:
 *
 * 1. **Nenhum hex.** A v4 escreve `#FFF6E9` e `#B4571F` direto; aqui cada um
 *    sai de token, e por isso a landing muda de cara junto com a identidade
 *    do evento em vez de ficar presa ao âmbar da Albora.
 * 2. **Nenhuma palavra de domínio.** Todo texto que diz "casamento" vem do
 *    pack, o que é o que faz `/15-anos` existir sem uma segunda página.
 *
 * A copy também diverge da v4 em três pontos, todos reportados: o original
 * promete "nenhum aplicativo" (contra o ADR 0008) e uma fila de aprovação de
 * moderação que o produto deliberadamente não tem.
 */

const WIDTH = "max-w-[78rem]";
const SIDE_PADDING = "px-[clamp(1.125rem,4vw,2.75rem)]";
const SECTION_PADDING = `py-[clamp(2.5rem,6vw,5.5rem)] ${SIDE_PADDING}`;

/** Montar é grátis — Completo sobe de plano depois de criar o evento. */
const HREF_CRIAR_GRATIS = "/admin/new?plano=free";
const HREF_CRIAR_COMPLETO = "/admin/new?plano=celebration";
const HREF_FORNECEDOR =
  "mailto:ola@albora.app?subject=Albora%20Fornecedor&body=Quero%20saber%20do%20plano%20Fornecedor.";
const HREF_DEMO = "/e/festa-demo?via=link";

const STEPS = [
  {
    title: "Ele aponta a câmera, e pronto",
    desc: "A placa já está na mesa. Aponta, toca no link e cai direto na tela de fotografar. Nada para baixar, nada para preencher.",
  },
  {
    title: "Escolhe as fotos e manda",
    desc: "No próprio celular ele marca as que já tirou e envia. Leva segundos, e funciona igual para quem tem 15 anos e para quem tem 80.",
  },
  {
    title: "O álbum já está lá",
    desc: "As fotos entram enquanto a festa acontece. No fim ele é seu, em resolução original, sem ninguém precisar mandar nada no dia seguinte.",
  },
] as const;

const NUMBERS = [
  { n: "4", o: "toques do QR até a primeira foto" },
  { n: "0", o: "downloads até a primeira foto" },
  { n: "48h", o: "de envio aberto depois da festa" },
  { n: "∞", o: "convidados e fotos, em todos os planos" },
] as const;

const COPIES = [
  { caption: "Bia · 21h", rotation: "-6deg" },
  { caption: "Tio João · 23h", rotation: "3deg" },
  { caption: "Marcos · meia-noite", rotation: "-2deg" },
  { caption: "Rafa · 02h", rotation: "5deg" },
  { caption: "Lu · amanhecer", rotation: "-4deg" },
] as const;

const SURFACES = [
  {
    label: "Feed ao vivo",
    caption: "A foto que alguém tirou há um minuto, do outro lado do salão.",
  },
  {
    label: "Missões",
    caption: "Um convite por vez, para quem nunca sabe o que fotografar.",
  },
  {
    label: "Galeria de cada um",
    caption: "Cada convidado vai embora com as próprias fotos no celular.",
  },
  {
    label: "O álbum inteiro",
    caption: "Tudo junto, em resolução original, no dia seguinte de manhã.",
  },
] as const;

const FACTS = [
  "Convidados e fotos sem limite, em todos os planos",
  "QR na mesa: nenhum download e nenhum cadastro até a primeira foto",
  "Fila offline: a foto sobe sozinha quando o sinal voltar",
  "Localização e dados do aparelho apagados no celular, antes de subir",
  "Feed, stories e reações liberados na hora que você escolher",
  "Telão em quatro modelos, e foto em pé nunca é cortada",
  "Envio aberto por 48 horas depois da festa",
  "Exportação para a sua nuvem no dia 330, e apagamos tudo no 365",
] as const;

const QUESTIONS = [
  {
    q: "Meus convidados vão baixar um aplicativo?",
    a: "Não para a primeira foto. Escaneiam o QR e já fotografam pelo navegador. O aplicativo é convidado depois do primeiro envio, para quem quiser feed, stories e a própria galeria.",
  },
  {
    q: "Quanto tempo leva para montar?",
    a: "Cerca de três minutos: nome do evento, data e a identidade visual. O QR e as placas saem prontos para impressão no fim.",
  },
  {
    q: "E se a internet do salão for ruim?",
    a: "As fotos entram numa fila dentro do celular e sobem sozinhas quando o sinal voltar. Vale mesmo se a pessoa fechar a tela ou for embora no meio do envio.",
  },
  {
    q: "Quem consegue ver as fotos do meu evento?",
    a: "Só quem escaneia o seu QR. A sessão do convidado vale para um evento e não passa para nenhum outro. Nada disso aparece em busca ou em página pública.",
  },
  {
    q: "E se alguém mandar uma foto inadequada?",
    a: "Por padrão tudo aparece, porque no dia da festa ninguém vai ficar aprovando foto numa fila. O que protege roda sozinho: um filtro checa cada foto antes de ela subir, qualquer convidado pode denunciar, e você tira do ar em um toque.",
  },
  {
    q: "As fotos ficam com vocês?",
    a: "São suas. No plano pago, a exportação para a sua nuvem roda sozinha no dia 330, e no dia 365 apagamos o que estiver conosco.",
  },
] as const;

function Section({
  children,
  id,
  className,
  reveal,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  reveal?: boolean;
}) {
  return (
    <section
      {...(id ? { id } : {})}
      className={cn("mx-auto", WIDTH, className ?? SECTION_PADDING)}
    >
      {reveal ? <Reveal>{children}</Reveal> : children}
    </section>
  );
}

export type LiveStats = { fotos: number; eventos: number };

export function LandingPage({ pack, live }: { pack: Pack; live?: LiveStats }) {
  const tokens = resolveTokens({
    marca: ALBORA_BRAND,
    pack: { ...pack.tokens, background: "light" },
  });

  const t = (key: string) => resolvePackText(pack, key);

  const missions = [...pack.missoes]
    .sort((a, b) => a.ordem - b.ordem)
    .map((m) => ({ id: m.id, title: t(m.chaveTitulo) }));

  const example = t("landing.exemplo.nome");
  const places = pack.lugares.map((l) => t(l.chaveTitulo));

  const eventMoments = (pack.momentos ?? []).map((m) => ({
    id: m.id,
    title: t(m.chaveTitulo),
    desc: t(m.chaveDesc),
  }));

  return (
    <div
      className="min-h-screen overflow-x-clip bg-bg font-corpo leading-normal text-ink"
      style={toVariables(tokens) as CSSProperties}
    >
      <LandingBeacon packHint={pack.id} />
      <header
        className={cn(
          "flex items-center justify-between gap-6 border-b border-linha bg-bg py-3.5",
          SIDE_PADDING,
        )}
      >
        <span className="entra">
          <AnimatedBrand />
        </span>

        <nav className="nav-topo gap-[1.625rem] text-ink-2">
          <a href="#experiencia" className="elo text-inherit no-underline">
            A experiência
          </a>
          <a href="#momentos" className="elo text-inherit no-underline">
            As fotos
          </a>
          <a href="#album" className="elo text-inherit no-underline">
            O álbum
          </a>
          <a href="#identidade" className="elo text-inherit no-underline">
            Identidade
          </a>
          <a href="#livro" className="elo text-inherit no-underline">
            Livro
          </a>
          <a href="#planos" className="elo text-inherit no-underline">
            Planos
          </a>
        </nav>

        <LandingCtaLink
          href={HREF_CRIAR_GRATIS}
          packHint={pack.id}
          className={cn(pillClasses, "px-[1.375rem] py-[0.6875rem] text-sm")}
        >
          {t("landing.cta")}
        </LandingCtaLink>
      </header>

      <Section className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${SIDE_PADDING}`}>
        <div className="relative overflow-hidden rounded-superficie bg-gradient-chao-quente">
          <div className="relative grid grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] items-center gap-[clamp(1.75rem,4vw,3.75rem)] p-[clamp(2.25rem,6vw,5.25rem)_clamp(1.5rem,4.5vw,4.5rem)]">
            <div>
              <span className="entra inline-flex items-center gap-2.5 rounded-pilula bg-superficie-alta py-[0.4375rem] pl-3 pr-4 text-[0.8125rem] text-ink-2">
                <span className="pulso size-1.5 rounded-full bg-acento" />
                {live
                  ? `${live.fotos.toLocaleString("pt-BR")} fotos enviadas · ${live.eventos} ${live.eventos === 1 ? "festa rolando" : "festas rolando"}`
                  : t("landing.rotulo")}
              </span>

              <h1 className="heroi-titulo entra-2 m-0 mt-6 font-titulo text-[clamp(2.5rem,5.6vw,4.625rem)] font-light leading-[1.02] tracking-titulo text-balance">
                {t("landing.titulo")} <Accent>{t("landing.titulo.destaque")}</Accent>
              </h1>

              <p className="entra-3 m-0 mt-[1.625rem] max-w-[30rem] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
                {t("landing.lede")}
              </p>

              <div className="mt-[2.125rem] flex flex-wrap gap-3">
                <LandingCtaLink href={HREF_CRIAR_GRATIS} packHint={pack.id} className={pillClasses}>
                  {t("landing.cta")}
                </LandingCtaLink>
                <a href="#momentos" className={lightPillClasses}>
                  Ver as fotos
                </a>
              </div>

              <p className="m-0 mt-[1.375rem] text-ink-3">
                Montar é grátis · não pedimos cartão · você decide antes de imprimir o QR
              </p>
              <p className="m-0 mt-3 text-[0.84375rem]">
                <a href="/scan" className="text-ink-3 underline">
                  Já tem o QR da festa? Escanear ou colar o link
                </a>
                {" · "}
                <LandingDemoLink href={HREF_DEMO} packHint={pack.id} className="text-ink-3 underline">
                  Abrir a demo
                </LandingDemoLink>
              </p>
            </div>

            <div className="relative flex justify-center">
              <div className="relative aspect-[9/19] w-[min(18.75rem,80vw)] rounded-superficie bg-gradient-device p-[0.5625rem] shadow-alta">
                <div
                  className="relative h-full w-full overflow-hidden"
                  style={radiusStyle("calc(var(--raio-superficie) - 0.5625rem)")}
                >
                  <Frame label="A festa, por quem estava nela" radius="calc(var(--raio-superficie) - 0.5625rem)" />
                </div>

                <span className="absolute -right-5 -top-7 grid size-[8.75rem] rotate-[5deg] place-items-center rounded-full bg-acento p-4 text-center font-titulo text-[0.9375rem] italic leading-[1.3] text-sobre-acento">
                  Fácil e rápido
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="demo" className={`pb-0 pt-[clamp(1.875rem,4vw,3.25rem)] ${SIDE_PADDING}`}>
        <ScrollDemo example={example} mission={missions[0]?.title ?? t("missao.livre")} />
      </Section>

      <Section id="experiencia" reveal>
        <div className="rounded-superficie bg-acento-superficie-suave p-[clamp(1.75rem,4vw,3.75rem)]">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(17.5rem,1fr))] items-center gap-[clamp(1.5rem,4vw,3.5rem)]">
            <div className="max-w-[26.25rem]">
              <Label>A experiência do convidado</Label>
              <Heading size="clamp(1.75rem, 3.6vw, 2.75rem)" className="mb-4">
                Três passos até a primeira foto.
              </Heading>

              <p className="m-0 mb-[1.375rem] max-w-[34ch] leading-normal text-ink-2">
                Uma leitura de QR e a foto já está no álbum. Sem cadastro, sem senha e sem baixar
                nada até a primeira.
              </p>

              {STEPS.map((p, i) => (
                <div
                  key={p.title}
                  className="flex items-start gap-[1.125rem] border-t border-linha py-5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-superficie-alta font-titulo text-acento-texto">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block">{p.title}</span>
                    <span className="mt-[0.3125rem] block text-[0.84375rem] leading-normal text-ink-2">
                      {p.desc}
                    </span>
                  </span>
                </div>
              ))}

              <a href="#demo" className="elo mt-5 inline-block text-acento-texto">
                Ver a experiência acontecendo
              </a>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(9.375rem,1fr))] gap-[0.875rem]">
              {NUMBERS.map((x) => (
                <div key={x.o} className="cartao rounded-superficie bg-superficie-alta p-6">
                  <p className="m-0 font-titulo text-[clamp(1.875rem,3.4vw,2.625rem)] font-light tabular-nums leading-none tracking-titulo text-acento-texto">
                    {x.n}
                  </p>
                  <p className="m-0 mt-3 leading-normal text-ink-2">{x.o}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section id="momentos" reveal>
        <Label>Durante e depois da festa</Label>
        <Heading size="clamp(1.875rem, 4.4vw, 3.5rem)">
          {t("landing.momentos.titulo")} <Accent>{t("landing.momentos.destaque")}</Accent>
        </Heading>
        <p className="m-0 mt-6 max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
          {t("landing.momentos.lede")}
        </p>

        <div className="mt-[clamp(2.5rem,6vw,4.25rem)]">
          <PolaroidFan copies={COPIES} />
        </div>

        <div className="mt-[clamp(2.25rem,5vw,3.75rem)] grid grid-cols-[repeat(auto-fit,minmax(13rem,1fr))] gap-x-[clamp(1.25rem,3vw,2.75rem)]">
          {SURFACES.map((s) => (
            <div key={s.label} className="border-t border-linha py-5">
              <p className="m-0 text-[0.6875rem] uppercase tracking-rotulo text-acento-texto">
                {s.label}
              </p>
              <p className="m-0 mt-2 text-sm leading-normal text-ink-2">{s.caption}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section reveal>
        <Missions
          missions={missions}
          title={t("landing.missoes.titulo")}
          highlight={t("landing.missoes.destaque")}
          lede={t("landing.missoes.lede")}
        />
      </Section>

      <Section id="album" reveal>
        <Label>O álbum, durante a festa</Label>
        <Heading size="clamp(1.875rem, 4.4vw, 3.5rem)">
          Todos os momentos, cada um <Accent>no seu capítulo.</Accent>
        </Heading>
        <p className="m-0 mt-6 mb-[clamp(2rem,4vw,3.25rem)] max-w-[46ch] text-[clamp(1rem,1.4vw,1.15625rem)] leading-normal text-ink-2">
          Cada foto chega sabendo a hora e o lugar em que foi tirada. É por isso que o álbum já
          nasce dividido nos momentos da festa, sem ninguém separar nada depois.
        </p>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))] gap-[clamp(0.875rem,2vw,1.5rem)]">
          {eventMoments.map((m, i) => (
            <figure key={m.id} className="cartao m-0 overflow-hidden rounded-superficie">
              <NightSlot variant={i} ratio="4 / 5" />
              <figcaption className="bg-superficie-alta px-[1.125rem] pb-5 pt-[1.0625rem]">
                <span className="block font-titulo text-[1.0625rem] leading-[1.2] tracking-titulo">
                  {m.title}
                </span>
                <span className="mt-[0.4375rem] block text-[0.8125rem] leading-[1.45] text-ink-2">
                  {m.desc}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>

        <p className="m-0 mt-[clamp(2.5rem,5vw,4rem)] mb-[clamp(0.5rem,1.5vw,1rem)] text-[0.8125rem] uppercase tracking-rotulo text-acento-texto">
          E dentro de cada capítulo, na ordem da noite
        </p>

        <Timeline />
      </Section>

      <Section id="identidade" reveal>
        <div className="mb-[clamp(1.5rem,3vw,2.375rem)] flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[41.25rem]">
            <Label>A identidade do seu evento</Label>
            <Heading size="clamp(1.875rem, 4.4vw, 3.5rem)">
              Uma decisão de cor, e ela <Accent>aparece em tudo.</Accent>
            </Heading>
          </div>
          <p className="m-0 max-w-[20rem] leading-normal text-ink-2">{t("landing.telao.lede")}</p>
        </div>

        <IdentityWall example={example} />

        <p className="m-0 mt-[1.375rem] max-w-[44rem] text-ink-3">
          {t("landing.telao.titulo")} E se não tiver, nada se perde: a festa inteira acompanha
          pelo próprio celular, que é onde a maior parte das fotos é vista de qualquer jeito.
        </p>
      </Section>

      <Section id="livro" reveal>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(18.75rem,1fr))] items-center gap-[clamp(1.75rem,4vw,4.5rem)]">
          <OpenAlbum />
          <div>
            <Label>Depois da festa</Label>
            <Heading size="clamp(1.75rem, 4vw, 3.125rem)">O outro álbum da sua festa.</Heading>
            <p className="m-0 mt-6 max-w-[28.75rem] text-[1.0625rem] leading-normal text-ink-2">
              Bastidores, ângulos que ninguém cobriu, a pista às 2h. Você encaixa cada foto no seu
              espaço e o arquivo sai pronto para a gráfica, no mesmo desenho da placa e do telão,
              sem precisar de designer.
            </p>

            <p className="m-0 mb-3 mt-[1.375rem] text-ink-2">
              E já chega separado por onde cada foto foi tirada:
            </p>
            <div className="flex flex-wrap gap-2">
              {places.map((place) => (
                <span
                  key={place}
                  className="rounded-pilula bg-superficie-alta px-[0.9375rem] py-[0.4375rem] text-[0.84375rem] text-ink-2"
                >
                  {place}
                </span>
              ))}
            </div>

            <p className="m-0 mt-[1.375rem] text-ink-3">Montar é grátis. O arquivo é seu.</p>
          </div>
        </div>
      </Section>

      <Section reveal>
        <div className="rounded-superficie bg-acento-superficie-suave p-[clamp(1.75rem,4vw,3.75rem)]">
          <Label>O que está incluído</Label>
          <Heading size="clamp(1.75rem, 3.6vw, 2.75rem)" className="max-w-[24ch]">
            Antes de falar de preço, o que você leva.
          </Heading>

          <ul className="m-0 mt-[clamp(1.5rem,3vw,2.375rem)] grid list-none grid-cols-[repeat(auto-fit,minmax(19rem,1fr))] gap-x-[clamp(1.5rem,4vw,3.5rem)] gap-y-1 p-0">
            {FACTS.map((fact) => (
              <li
                key={fact}
                className="flex items-baseline gap-[0.875rem] border-b border-linha py-[0.9375rem] leading-normal text-ink-2"
              >
                <span className="shrink-0 text-acento-texto" aria-hidden="true">
                  ✓
                </span>
                {fact}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="planos" reveal>
        <Heading
          size="clamp(1.75rem, 4.2vw, 3.25rem)"
          className="mb-[clamp(1.625rem,3.5vw,2.875rem)] max-w-[41.25rem]"
        >
          {t("landing.planos.titulo")}
        </Heading>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(16.5rem,1fr))] gap-4">
          {[
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
          ].map((plan) => (
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
                  packHint={pack.id}
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
          Nada é cobrado depois da festa. A decisão acontece antes de imprimir o QR.
        </p>
      </Section>

      <Section className={`pb-[clamp(3.5rem,8vw,6.875rem)] pt-0 ${SIDE_PADDING}`}>
        <div className="max-w-[58.75rem]">
          {QUESTIONS.map((p, i) => (
            <div
              key={p.q}
              className={cn(
                "pergunta grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-[clamp(1.125rem,4vw,3.25rem)] border-t border-linha py-[1.625rem]",
                i === QUESTIONS.length - 1 && "border-b",
              )}
            >
              <h3 className="m-0 font-titulo text-[clamp(1.125rem,2vw,1.4375rem)] font-normal leading-[1.25]">
                {p.q}
              </h3>
              <p className="m-0 leading-[1.65] text-ink-2">{p.a}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section className={`pb-[clamp(2.5rem,6vw,5rem)] pt-0 ${SIDE_PADDING}`}>
        <div className="relative overflow-hidden rounded-superficie bg-gradient-chao-quente p-[clamp(2.75rem,7vw,6.875rem)_clamp(1.5rem,4vw,3.75rem)] text-center">
          <div className="relative mx-auto max-w-[53.75rem]">
            <Heading size="clamp(1.75rem, 4.6vw, 3.625rem)" className="m-0 leading-[1.04]">
              {t("landing.fechamento")} <Accent>{t("landing.fechamento.destaque")}</Accent>
            </Heading>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <LandingCtaLink href={HREF_CRIAR_GRATIS} packHint={pack.id} className={pillClasses}>
                {t("landing.cta")}
              </LandingCtaLink>
              <a href={HREF_FORNECEDOR} className={lightPillClasses}>
                Sou cerimonialista
              </a>
            </div>
          </div>
        </div>
      </Section>

      <footer
        className={cn(
          "mx-auto flex flex-wrap items-center justify-between gap-[1.125rem] pb-11 text-ink-2",
          WIDTH,
          SIDE_PADDING,
        )}
      >
        <span className="flex items-center gap-2.5">
          <Brand id="brand-footer" size={22} />
          <span className="font-titulo">Albora · o álbum coletivo da sua festa</span>
        </span>
        <span className="text-ink-3">Feito no Brasil</span>
      </footer>

      <div className="cta-fixo fixed bottom-3 left-3 right-3 z-[70] gap-3 rounded-pilula bg-ink p-2.5 pl-5">
        <span className="flex-1 text-[0.84375rem] leading-[1.3] text-bg">
          Montar é grátis. Leva 3 minutos.
        </span>
        <LandingCtaLink
          href={HREF_CRIAR_GRATIS}
          packHint={pack.id}
          className={cn(pillClasses, "bg-bg px-[1.375rem] py-3 text-ink")}
        >
          Criar álbum
        </LandingCtaLink>
      </div>
    </div>
  );
}
