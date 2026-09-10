import Image from "next/image";
import Link from "next/link";
import React, { type CSSProperties, type ReactNode } from "react";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import { VENDOR_PLANS, vendorPlanPrice } from "../data/vendor-plans";

const START_HREF = "/admin/vendor/new?next=event";

const JOURNEY = [
  {
    number: "01",
    title: "Você configura",
    body: "Crie o evento, escolha a identidade e baixe o QR para divulgar.",
  },
  {
    number: "02",
    title: "Os convidados participam",
    body: "Eles entram pelo navegador, sem cadastro ou aplicativo, e enviam fotos e mensagens.",
  },
  {
    number: "03",
    title: "A festa aparece ao vivo",
    body: "O telão recebe os registros aprovados enquanto sua equipe acompanha tudo pelo portal.",
  },
  {
    number: "04",
    title: "Você entrega",
    body: "O casal recebe um álbum organizado, pronto para rever, baixar e compartilhar.",
  },
] as const;

const INCLUDED = [
  "QR e link do evento",
  "Fotos e mensagens dos convidados",
  "Missões para aumentar a participação",
  "Telão ao vivo",
  "Álbum e exportação básica",
  "Acesso sem aplicativo",
] as const;

function Brand() {
  return (
    <Link href="/" className="inline-flex items-center gap-2 font-titulo text-lg text-ink no-underline">
      <Image src="/logo-animado-estrela.svg" alt="" width={28} height={28} priority />
      <span>Albora</span>
    </Link>
  );
}

function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center rounded-pilula bg-acento px-6 py-3 text-sm font-semibold text-sobre-acento no-underline transition-[transform,opacity] duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:opacity-90 active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

export function VendorLanding() {
  const tokens = resolveTokens({ marca: ALBORA_BRAND, pack: { background: "light" } });

  return (
    <main
      className="min-h-dvh bg-bg font-corpo text-ink"
      style={toVariables(tokens) as CSSProperties}
    >
      <header className="sticky top-0 z-sticky border-b border-linha bg-bg-vidro-opaco">
        <div className="mx-auto flex min-h-16 w-full max-w-[80rem] items-center justify-between gap-5 px-5 sm:px-8">
          <Brand />
          <nav aria-label="Navegação da página" className="hidden items-center gap-7 text-sm text-ink-2 md:flex">
            <a href="#produto" className="text-inherit no-underline hover:text-ink">Produto</a>
            <a href="#operacao" className="text-inherit no-underline hover:text-ink">Operação</a>
            <a href="#planos" className="text-inherit no-underline hover:text-ink">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/admin/sign-in" className="hidden min-h-11 items-center px-3 text-sm text-ink-2 no-underline hover:text-ink sm:inline-flex">
              Entrar
            </Link>
            <PrimaryLink href={START_HREF}>Criar evento</PrimaryLink>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[80rem] gap-12 px-5 pb-20 pt-14 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] lg:items-center lg:pb-28 lg:pt-20">
        <div className="max-w-[42rem]">
          <p className="mb-5 mt-0 text-base text-acento-texto">Para fotógrafos, assessorias, buffets e espaços de eventos</p>
          <h1 className="tipo-display tipo-balance m-0 max-w-[13ch]">Entregue a festa que seus clientes não conseguiram ver inteira.</h1>
          <p className="tipo-body-lg mb-0 mt-7 max-w-[55ch] text-ink-2">
            O Albora reúne o olhar dos convidados em uma experiência com a sua marca: QR, fotos, mensagens, missões, telão e álbum em um só fluxo.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <PrimaryLink href={START_HREF}>Criar meu primeiro evento</PrimaryLink>
            <a href="#produto" className="inline-flex min-h-11 items-center justify-center px-5 text-sm font-medium text-ink no-underline hover:text-acento-texto">
              Ver o que será entregue
            </a>
          </div>
          <p className="tipo-caption mb-0 mt-4 text-ink-3">Configure uma demonstração antes de escolher o plano.</p>
        </div>

        <div className="relative min-h-[31rem] overflow-hidden rounded-superficie bg-acento-superficie sm:min-h-[39rem]">
          <Image
            src="/fornecedores/pista-multigeracional.webp"
            alt="Convidados de diferentes gerações dançando juntos em uma festa"
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-veu-card" aria-hidden />
          <div className="absolute inset-x-5 bottom-5 grid gap-3 sm:inset-x-8 sm:bottom-8 sm:grid-cols-2">
            <div className="rounded-token bg-bg-vidro-opaco p-5">
              <strong className="block font-titulo text-4xl font-normal text-ink">82%</strong>
              <span className="tipo-caption text-ink-2">dos convidados participaram</span>
            </div>
            <div className="rounded-token bg-bg-vidro-opaco p-5">
              <strong className="block font-titulo text-4xl font-normal text-ink">312</strong>
              <span className="tipo-caption text-ink-2">registros reunidos até agora</span>
            </div>
          </div>
        </div>
      </section>

      <section id="produto" className="border-y border-linha bg-superficie">
        <div className="mx-auto w-full max-w-[80rem] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid gap-10 lg:grid-cols-[minmax(17rem,0.7fr)_minmax(0,1.3fr)]">
            <div>
              <h2 className="tipo-title tipo-balance m-0">Uma experiência para o casal. Uma operação clara para você.</h2>
              <p className="tipo-body mb-0 mt-5 text-ink-2">Cada pessoa vê somente o que precisa, enquanto a identidade permanece consistente da placa impressa ao álbum.</p>
            </div>
            <ol className="m-0 grid list-none gap-x-8 gap-y-9 p-0 sm:grid-cols-2">
              {JOURNEY.map((step) => (
                <li key={step.number} className="border-t border-linha pt-5">
                  <span className="tipo-caption text-acento-texto">{step.number}</span>
                  <h3 className="tipo-subtitle mb-0 mt-3">{step.title}</h3>
                  <p className="tipo-caption mb-0 mt-2 text-ink-2">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section id="operacao" className="mx-auto grid w-full max-w-[80rem] gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-28">
        <div className="relative aspect-[4/5] overflow-hidden rounded-superficie sm:aspect-[5/4] lg:aspect-[4/5]">
          <Image
            src="/fornecedores/convidados-fotografando.webp"
            alt="Grupo de amigos registrando um momento da festa"
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
        <div className="lg:px-8">
          <h2 className="tipo-title tipo-balance m-0">A festa acontece longe da câmera oficial.</h2>
          <p className="tipo-body-lg mb-0 mt-5 text-ink-2">O Albora reúne os momentos da pista, da mesa e do meio do abraço. Sua equipe acompanha a participação e entrega esse outro ponto de vista ao casal.</p>
          <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li key={item} className="flex gap-3 border-t border-linha py-4 text-sm text-ink-2">
                <span aria-hidden className="text-acento-texto">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <PrimaryLink href={START_HREF}>Montar uma demonstração</PrimaryLink>
        </div>
      </section>

      <section id="planos" className="bg-superficie-alta">
        <div className="mx-auto w-full max-w-[80rem] px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-[48rem]">
            <h2 className="tipo-title tipo-balance m-0">Comece completo. Aumente a capacidade quando sua operação crescer.</h2>
            <p className="tipo-body mb-0 mt-5 text-ink-2">Todo plano entrega a experiência central. Você paga mais quando precisa de escala, equipe, marca própria e suporte.</p>
          </div>
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {VENDOR_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={`flex flex-col rounded-superficie border p-7 ${plan.featured ? "border-acento bg-acento-superficie shadow-suave" : "border-linha bg-superficie"}`}
              >
                <h3 className="tipo-subtitle m-0">{plan.name}</h3>
                <p className="tipo-caption mb-0 mt-2 min-h-10 text-ink-2">{plan.audience}</p>
                <p className="mb-0 mt-7 font-titulo text-4xl font-normal tabular-nums">
                  {vendorPlanPrice(plan.id)}<span className="font-corpo text-sm text-ink-3">/mês</span>
                </p>
                <ul className="mb-8 mt-7 flex list-none flex-col gap-3 p-0 text-sm text-ink-2">
                  {plan.benefits.map((benefit) => (
                    <li key={benefit} className="flex gap-3"><span aria-hidden className="text-acento-texto">✓</span>{benefit}</li>
                  ))}
                </ul>
                <Link
                  href={`${START_HREF}&plan=${plan.id}`}
                  className={`mt-auto inline-flex min-h-11 items-center justify-center rounded-pilula border px-5 py-3 text-sm font-semibold no-underline transition-opacity hover:opacity-85 ${plan.featured ? "border-acento bg-acento text-sobre-acento" : "border-linha text-ink"}`}
                >
                  Começar com {plan.name}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-[80rem] flex-col items-start justify-between gap-8 px-5 py-20 sm:px-8 lg:flex-row lg:items-end lg:py-28">
        <div className="max-w-[48rem]">
          <h2 className="tipo-title tipo-balance m-0">Crie um evento de demonstração com a sua identidade.</h2>
          <p className="tipo-body mb-0 mt-5 text-ink-2">Você verá o que o convidado acessa, o que aparece no telão e o que o casal recebe no final.</p>
        </div>
        <PrimaryLink href={START_HREF}>Criar evento</PrimaryLink>
      </section>

      <footer className="border-t border-linha">
        <div className="mx-auto flex w-full max-w-[80rem] flex-col gap-4 px-5 py-8 text-sm text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Brand />
          <div className="flex gap-5"><Link href="/privacidade" className="text-inherit">Privacidade</Link><Link href="/admin/sign-in" className="text-inherit">Portal do fornecedor</Link></div>
        </div>
      </footer>
    </main>
  );
}
