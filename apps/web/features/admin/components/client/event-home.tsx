import type { ComponentType, CSSProperties } from "react";
import Link from "next/link";
import { CommentIcon, GridIcon, ShareIcon, StackIcon, SunIcon, UsersIcon } from "@albora/ui-web";
import { eventColorVariablesFrom } from "@albora/tokens";
import { PACKS } from "@albora/packs";
import { CopiarLinkEvento } from "@/features/admin/components/client/copiar-link-evento";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { PreEventPromo } from "@/features/admin/components/client/pre-event-promo";
import { typePhoto } from "@/features/admin/components/client/onboarding/onboarding-photos";
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

/** Botão na cor do próprio evento (identidade propaga): a marca é a moldura, o evento é o quadro. */
const acaoPrimaria =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-pilula px-6 font-titulo text-[1rem] no-underline shadow-suave transition-[transform,opacity] duration-instantaneo ease-mola hover:opacity-90 active:scale-[0.98]";
const acentoStyle: CSSProperties = {
  background: "var(--ev, var(--acento))",
  color: "var(--ev-on, var(--sobre-acento))",
};

function VerComoConvidado({ slug }: { slug: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Link
        href={`/e/${slug}?via=link`}
        target="_blank"
        rel="noopener noreferrer"
        className={acaoPrimaria}
        style={acentoStyle}
      >
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

type Ferramenta = { label: string; hint: string; icon: ComponentType<{ size?: number }>; suffix: string };

/** Principais ferramentas do evento, à mão na home — atalhos pros ajustes que o anfitrião mais usa. */
const FERRAMENTAS: Ferramenta[] = [
  { label: "Capa & aparência", hint: "Cor, fonte e capa", icon: SunIcon, suffix: "/identity" },
  { label: "Missões", hint: "Desafios de foto", icon: StackIcon, suffix: "/missions" },
  { label: "QR e peças", hint: "Placa, cards e link", icon: ShareIcon, suffix: "/qrcode" },
  { label: "Telão", hint: "A tela do salão", icon: GridIcon, suffix: "/identity" },
  { label: "Convidados", hint: "Quem foi e participou", icon: UsersIcon, suffix: "/guests" },
  { label: "Recado", hint: "Boas-vindas do casal", icon: CommentIcon, suffix: "/guestbook" },
];

function Ferramentas({ base }: { base: string }) {
  return (
    <section>
      <h2 className="tipo-label m-0 mb-3 text-ink-3">Ferramentas do seu evento</h2>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {FERRAMENTAS.map(({ label, hint, icon: Icon, suffix }) => (
          <Link
            key={label}
            href={`${base}${suffix}`}
            className="flex flex-col gap-2 rounded-superficie border border-linha bg-superficie p-4 no-underline transition-colors duration-[var(--tempo-rapido)] ease-[var(--curva)] hover:bg-superficie-alta"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-token bg-superficie-alta text-ink-2">
              <Icon size={18} />
            </span>
            <span className="tipo-label text-ink">{label}</span>
            <span className="tipo-caption text-ink-3">{hint}</span>
          </Link>
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
  img,
}: {
  name: string;
  meta: string;
  destaque: string;
  legenda: string;
  img: string;
}) {
  return (
    <section className="relative overflow-hidden rounded-superficie border border-linha shadow-suave">
      <div className="relative aspect-[16/11] w-full sm:aspect-[21/8]">
        <img src={img} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <span aria-hidden className="scrim-foto-forte absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 flex flex-col p-[clamp(1.5rem,4vw,2.5rem)]">
          <h1
            className="sobre-foto tipo-title m-0 text-[clamp(1.8rem,5vw,2.6rem)] leading-[1.05]"
            style={{ fontFamily: "var(--fonte-titulo, inherit)" }}
          >
            {name}
          </h1>
          {meta && <p className="sobre-foto m-0 mt-2 text-[0.95rem]">{meta}</p>}
          <p className="m-0 mt-5 flex items-baseline gap-2">
            <span className="sobre-foto font-titulo text-[clamp(2.8rem,9vw,4.5rem)] leading-none">{destaque}</span>
            <span className="sobre-foto text-[0.95rem]">{legenda}</span>
          </p>
        </div>
      </div>
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
  // Só as cores do evento (--ev*): personaliza o botão sem tocar na superfície clara do admin.
  const eventVars = eventColorVariablesFrom(evento.identityTokens) as CSSProperties;
  // Capa do herói: foto do pack (por ordem de criação, sem string de domínio) enquanto a capa
  // real do evento não está resolvida aqui.
  const heroImg = typePhoto(PACKS[evento.packId]?.ordemCriacao);

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
      <div className="flex flex-col gap-8" style={eventVars}>
        <HeroCard
          name={ctx.name}
          meta={meta}
          destaque={dias === 1 ? "1" : String(dias)}
          legenda={dias === 1 ? "dia para a festa" : "dias para a festa"}
          img={heroImg}
        />
        <VerComoConvidado slug={evento.slug} />
        <section>
          <h2 className="tipo-label m-0 mb-3 text-ink-3">Termine de deixar tudo pronto</h2>
          <PreEventPromo eventId={evento.eventoId} storageKey={checklistStorageKey} startsAt={evento.comecaEm} />
        </section>
        <Ferramentas base={`/admin/e/${eventId}`} />
        <ComoFunciona />
      </div>
    );
  }

  if (fase === "durante") {
    return (
      <div className="flex flex-col gap-8" style={eventVars}>
        <HeroCard name={ctx.name} meta={meta} destaque="Ao vivo" legenda="a festa está acontecendo" img={heroImg} />
        <VerComoConvidado slug={evento.slug} />
        <LiveSummary eventoId={eventId} />
        <Ferramentas base={`/admin/e/${eventId}`} />
        {controles}
      </div>
    );
  }

  // depois
  return (
    <div className="flex flex-col gap-8" style={eventVars}>
      <HeroCard name={ctx.name} meta={meta} destaque="Que noite." legenda="as fotos são de vocês agora" img={heroImg} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link href={`/admin/e/${eventId}/album`} className={acaoPrimaria} style={acentoStyle}>
          Ver o álbum
        </Link>
        <CopiarLinkEvento slug={evento.slug} />
      </div>
      <LiveSummary eventoId={eventId} />
    </div>
  );
}
