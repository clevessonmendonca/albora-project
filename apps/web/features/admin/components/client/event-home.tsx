import type { CSSProperties } from "react";
import Link from "next/link";
import { eventColorVariablesFrom } from "@albora/tokens";
import { PACKS } from "@albora/packs";
import { assinarGet } from "@/lib/r2";
import { loadHomeState, type EstadoDaHome } from "@/features/admin/data/load-home-state";
import { CopiarLinkEvento } from "@/features/admin/components/client/copiar-link-evento";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { typePhoto } from "@/features/admin/components/client/onboarding/onboarding-photos";
import type { AdminEventPageContext } from "@/features/admin/data/load-event-page";
import { HeroDoEvento } from "./home/hero-do-evento";
import { ProximaAcao } from "./home/proxima-acao";
import { Preparo } from "./home/preparo";
import { PreviaDoConvidado } from "./home/previa-convidado";
import { AvisoDeRetencao } from "./home/retencao";
import { Payoffdepois } from "./home/depois";
import { CapsulaDeMemoria } from "./home/capsula";
import { VerComoConvidado } from "./home/acoes";
import { acaoPrimaria, acaoSecundaria, estiloAcento } from "./home/estilos";

const VALIDADE_CAPA_SEGUNDOS = 900;

function fmtData(d: Date, fuso: string): string {
  try {
    const dia = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      timeZone: fuso,
    }).format(d);
    const hora = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: fuso,
    }).format(d);
    return `${dia} · ${hora.replace(":", "h")}`;
  } catch {
    return "";
  }
}

/** Capa real do casal quando existe; foto do pack enquanto não escolheram. */
async function capaOuExemplo(chave: string | null, packId: string): Promise<string> {
  if (chave) {
    try {
      return await assinarGet(chave, VALIDADE_CAPA_SEGUNDOS);
    } catch {
      // Storage indisponível não pode derrubar o painel — cai no exemplo.
    }
  }
  return typePhoto(PACKS[packId]?.ordemCriacao);
}

type Tom = { kicker: string; destaque: string; legenda: string };

function tomDaFase(estado: EstadoDaHome): Tom {
  const d = estado.dias;
  const plural = d === 1 ? "dia para a festa" : "dias para a festa";
  switch (estado.fase) {
    case "recem":
      return { kicker: "Seu álbum começa aqui", destaque: String(d), legenda: plural };
    case "distante":
      return { kicker: "Sem pressa", destaque: String(d), legenda: plural };
    case "aproximando":
      return { kicker: "Falta pouco", destaque: String(d), legenda: plural };
    case "semana":
      return { kicker: "Semana da festa", destaque: String(d), legenda: plural };
    case "vespera":
      return { kicker: "Quase lá", destaque: "É amanhã", legenda: "está quase tudo pronto" };
    case "hoje":
      return { kicker: "É hoje", destaque: "Hoje", legenda: "é o grande dia" };
    case "aovivo":
      return { kicker: "Acontecendo agora", destaque: "Ao vivo", legenda: "a festa começou" };
    default:
      return { kicker: "A festa acabou", destaque: "As memórias ficaram", legenda: "" };
  }
}

/**
 * Home do painel — um assistente do evento, não um dashboard. O que aparece muda
 * com o momento do casamento: antes prioriza dar cara ao álbum, na semana vira
 * conferência, no dia vira central ao vivo e depois vira memória.
 */
export async function EventHome({
  ctx,
  eventId,
}: {
  ctx: AdminEventPageContext;
  eventId: string;
}) {
  const { evento, canManageCoupleOnly } = ctx;
  const base = `/admin/e/${eventId}`;
  const estado = await loadHomeState(evento);
  const vars = eventColorVariablesFrom(evento.identityTokens) as CSSProperties;
  const img = await capaOuExemplo(evento.coverImageKey, evento.packId);

  const localRaw = evento.identityTokens["local"];
  const local = typeof localRaw === "string" ? localRaw : "";
  const meta = [fmtData(evento.comecaEm, evento.fuso), local].filter(Boolean).join(" · ");
  const tom = tomDaFase(estado);

  const aoVivo = estado.fase === "hoje" || estado.fase === "aovivo";
  // Em rascunho o link existe mas não abre — oferecer copiar é mandar o casal
  // divulgar uma porta fechada.
  const publicado = evento.status !== "draft";
  const depois = estado.fase === "depois";
  const pendentes = estado.itens.filter((i) => !i.feito && i.chave !== estado.proxima?.chave);

  const acoesDoHero = depois ? (
    <>
      <Link href={`${base}/album`} className={acaoPrimaria} style={estiloAcento}>
        Ver o álbum
      </Link>
      {publicado && <CopiarLinkEvento slug={evento.slug} />}
    </>
  ) : aoVivo ? (
    <>
      <Link
        href="/wall-display"
        target="_blank"
        rel="noopener noreferrer"
        className={acaoPrimaria}
        style={estiloAcento}
      >
        Abrir o telão
      </Link>
      <VerComoConvidado eventId={eventId} slug={evento.slug} />
      {publicado && <CopiarLinkEvento slug={evento.slug} />}
    </>
  ) : (
    <>
      {estado.proxima && (
        <Link href={estado.proxima.href} className={acaoPrimaria} style={estiloAcento}>
          {estado.proxima.cta}
        </Link>
      )}
      <VerComoConvidado eventId={eventId} slug={evento.slug} />
    </>
  );

  return (
    <div className="flex flex-col gap-[clamp(2rem,5vh,3rem)]" style={vars}>
      <HeroDoEvento
        nome={ctx.name}
        meta={meta}
        img={img}
        vars={vars}
        kicker={tom.kicker}
        destaque={tom.destaque}
        legenda={tom.legenda}
        acoes={acoesDoHero}
      />

      {/* Rascunho é a borda mais cara: o herói convida a compartilhar o link e o
          convidado bate numa porta fechada. Avisa antes de qualquer outra coisa. */}
      {evento.status === "draft" && (
        <section className="rounded-superficie border border-linha bg-superficie p-[clamp(1.25rem,3vw,1.75rem)]">
          <h2 className="tipo-subtitle m-0 text-ink">Seus convidados ainda não entram</h2>
          <p className="tipo-body m-0 mt-2 max-w-[46ch] text-ink-2">
            O evento está em rascunho. O link e o QR só funcionam depois de publicar.
          </p>
          <Link href="#controle-publicar" className={`${acaoPrimaria} mt-4`} style={estiloAcento}>
            Publicar evento
          </Link>
        </section>
      )}

      {/* Ao vivo: números passam a importar e as ações críticas vêm primeiro. */}
      {aoVivo && (
        <>
          <LiveSummary eventoId={eventId} />
          <section>
            <h2 className="tipo-label m-0 mb-3 text-ink-3">Durante a festa</h2>
            <div className="flex flex-wrap gap-2.5">
              <Link href={`${base}/moderation`} className={acaoSecundaria}>
                Revisar fotos
              </Link>
              <Link href={`${base}/qrcode`} className={acaoSecundaria}>
                QR das mesas
              </Link>
              <Link href={`${base}/album`} className={acaoSecundaria}>
                Álbum ao vivo
              </Link>
            </div>
          </section>
        </>
      )}

      {/* Depois: a página vira memória — nada de configuração pré-evento. */}
      {depois && (
        <>
          {estado.payoff && <Payoffdepois base={base} payoff={estado.payoff} />}
          <AvisoDeRetencao
            base={base}
            terminaEm={evento.terminaEm}
            fuso={evento.fuso}
            marcos={estado.marcosDeRetencao}
          />
          <CapsulaDeMemoria eventoId={eventId} inicial={evento.capsulaDeMemoria} />
        </>
      )}

      {/* Antes da festa: uma ação por vez, progresso real e a prévia do convidado. */}
      {!aoVivo && !depois && (
        <>
          {estado.proxima && (
            <ProximaAcao principal={estado.proxima} secundarias={pendentes.slice(0, 2)} />
          )}

          {estado.fase !== "recem" && (
            <Preparo
              estado={estado}
              titulo={
                estado.fase === "semana" || estado.fase === "vespera"
                  ? "Conferência final"
                  : "Seu Álbora está tomando forma"
              }
            />
          )}

          <PreviaDoConvidado
            eventId={eventId}
            slug={evento.slug}
            nome={ctx.name}
            data={fmtData(evento.comecaEm, evento.fuso)}
            img={img}
            vars={vars}
          />
        </>
      )}

      {/* Estes controles viviam na Home em todas as fases antes do redesign; prendê-los
          à festa tirava publicar, gates, música e peças de quem ainda está preparando. */}
      <section>
        <h2 className="tipo-label m-0 mb-3 text-ink-3">Ajustes do evento</h2>
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
      </section>

      <p className="m-0 text-center">
        <Link
          href={`${base}/evento`}
          className="tipo-caption text-ink-3 no-underline transition-colors hover:text-ink"
        >
          Todos os ajustes do evento →
        </Link>
      </p>
    </div>
  );
}
