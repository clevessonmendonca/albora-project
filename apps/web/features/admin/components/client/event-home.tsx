import Link from "next/link";
import { CopiarLinkEvento } from "@/features/admin/components/client/copiar-link-evento";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { PreEventPromo } from "@/features/admin/components/client/pre-event-promo";
import type { AdminEventPageContext } from "@/features/admin/data/load-event-page";

/** Passos de como o Álbora funciona na festa — conteúdo fixo do produto (sem domínio de pack).
 *  Fotos de exemplo servidas de /onboarding (as mesmas do fluxo de criação). */
const STEPS: { n: string; label: string; img: string }[] = [
  { n: "01", label: "Aponte a câmera no QR", img: "/onboarding/photo-02.webp" },
  { n: "02", label: "Entra sem baixar app", img: "/onboarding/photo-09.webp" },
  { n: "03", label: "Envia uma foto", img: "/onboarding/photo-07.webp" },
  { n: "04", label: "Aparece no álbum", img: "/onboarding/photo-08.webp" },
  { n: "05", label: "E no telão, na hora", img: "/onboarding/photo-03.webp" },
];

function fmtData(d: Date, fuso: string): string {
  try {
    const dia = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", timeZone: fuso }).format(d);
    const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: fuso }).format(d);
    return `${dia} · ${hora.replace(":", "h")}`;
  } catch {
    return "";
  }
}

function diasPara(d: Date): number {
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/** Botão de acento (mesma linguagem do painel), como <Link>. */
const acaoPrimaria =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pilula bg-acento px-6 font-titulo text-[1rem] text-sobre-acento no-underline shadow-suave transition-[transform,opacity] duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.98]";

function VerComoConvidado({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Link href={`/e/${slug}?via=link`} target="_blank" rel="noopener noreferrer" className={acaoPrimaria}>
        Ver como meus convidados vão ver
      </Link>
      <CopiarLinkEvento slug={slug} />
    </div>
  );
}

/** Faixa "Veja o Álbora acontecer" — a trilha de 5 passos do produto. */
function ComoFunciona() {
  return (
    <section>
      <h2 className="tipo-label m-0 mb-3 text-ink-3">Veja o Álbora acontecer</h2>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STEPS.map((s) => (
          <div key={s.n} className="w-[9.5rem] shrink-0">
            <div className="relative aspect-[3/4] overflow-hidden rounded-superficie border border-linha bg-superficie-alta shadow-suave">
              <img src={s.img} alt="" className="absolute inset-0 h-full w-full object-cover" />
              <span aria-hidden className="scrim-foto-forte absolute inset-0" />
              <span className="sobre-foto absolute left-3 top-2.5 font-titulo text-[0.8rem] opacity-80">{s.n}</span>
            </div>
            <p className="tipo-caption m-0 mt-2 text-ink-2">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function HeroCard({
  name,
  meta,
  destaque,
  legenda,
}: {
  name: string;
  meta: string;
  destaque: string;
  legenda: string;
}) {
  return (
    <section className="rounded-superficie border border-linha bg-superficie-alta p-[clamp(1.5rem,4vw,2.5rem)] shadow-suave">
      <h1 className="tipo-title m-0 text-[clamp(1.8rem,5vw,2.6rem)] leading-[1.05]">{name}</h1>
      {meta && <p className="tipo-body m-0 mt-2 text-ink-2">{meta}</p>}
      <p className="m-0 mt-6 flex items-baseline gap-2">
        <span className="font-titulo text-[clamp(2.8rem,9vw,4.5rem)] leading-none text-acento-texto">{destaque}</span>
        <span className="tipo-body text-ink-2">{legenda}</span>
      </p>
    </section>
  );
}

/** Home do painel, adaptada à fase do evento (antes/durante/depois). Só dados que já existem;
 *  reviver/stories/timeline ficam como pendência. */
export function EventHome({
  ctx,
  eventId,
}: {
  ctx: AdminEventPageContext;
  eventId: string;
}) {
  const { evento, canManageCoupleOnly, checklistStorageKey } = ctx;
  const dias = diasPara(evento.comecaEm);
  const fase = evento.status === "ended" ? "depois" : dias > 0 ? "antes" : "durante";
  const localRaw = evento.identityTokens["local"];
  const local = typeof localRaw === "string" ? localRaw : "";
  const meta = [fmtData(evento.comecaEm, evento.fuso), local].filter(Boolean).join(" · ");

  const controles = (
    <EventControls
      eventId={evento.eventoId}
      slug={evento.slug}
      plan={evento.plan}
      initial={evento.moderacao}
      initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
      initialDeliveryOpensAt={evento.deliveryOpensAt?.toISOString() ?? null}
      initialStatus={evento.status}
      canManageCoupleOnly={canManageCoupleOnly}
    />
  );

  if (fase === "antes") {
    return (
      <div className="flex flex-col gap-8">
        <HeroCard
          name={ctx.name}
          meta={meta}
          destaque={dias === 1 ? "1" : String(dias)}
          legenda={dias === 1 ? "dia para a festa" : "dias para a festa"}
        />
        <VerComoConvidado slug={evento.slug} />
        <ComoFunciona />
        <section>
          <h2 className="tipo-label m-0 mb-3 text-ink-3">Seu evento já está pronto</h2>
          <PreEventPromo eventId={evento.eventoId} storageKey={checklistStorageKey} startsAt={evento.comecaEm} />
        </section>
      </div>
    );
  }

  if (fase === "durante") {
    return (
      <div className="flex flex-col gap-8">
        <HeroCard name={ctx.name} meta={meta} destaque="Ao vivo" legenda="a festa está acontecendo" />
        <VerComoConvidado slug={evento.slug} />
        <LiveSummary eventoId={eventId} />
        {controles}
      </div>
    );
  }

  // depois
  return (
    <div className="flex flex-col gap-8">
      <HeroCard name={ctx.name} meta={meta} destaque="Que noite." legenda="as fotos são de vocês agora" />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href={`/admin/e/${eventId}/album`} className={acaoPrimaria}>
          Ver o álbum
        </Link>
        <CopiarLinkEvento slug={evento.slug} />
      </div>
      <LiveSummary eventoId={eventId} />
    </div>
  );
}
