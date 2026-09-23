import React from "react";
import Link from "next/link";
import { faseDoEvento } from "@albora/core";
import { buttonClasses } from "@albora/ui-web";
import { AdminCard, AdminSection } from "@/features/admin/components/server/admin-shell";
import { ContagemRegressiva } from "@/features/admin/components/client/contagem-regressiva";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { EventTeamPanel } from "@/features/admin/components/client/event-team-panel";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { PreEventPromo } from "@/features/admin/components/client/pre-event-promo";
import { proximosPassos, type Passo } from "@/features/admin/lib/proximos-passos";
import type { AdminEventPageContext } from "@/features/admin/data/load-event-page";

function dataPorExtenso(quando: Date): string {
  return quando.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function ProximosPassos({ passos }: { passos: Passo[] }) {
  if (passos.length === 0) {
    return (
      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-2 text-ink">Tudo pronto</h2>
        <p className="tipo-body m-0 text-ink-2">
          O evento está preparado. Daqui até a festa, é só esperar.
        </p>
      </AdminSection>
    );
  }

  return (
    <AdminSection>
      <h2 className="tipo-subtitle m-0 mb-1 text-ink">Uma coisa agora</h2>
      <p className="tipo-caption m-0 mb-5 text-ink-2">
        {passos.length === 1 ? "Falta isto:" : `Faltam ${passos.length} coisas. Comece por cima.`}
      </p>
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {passos.map((passo) => (
          <li
            key={passo.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-token border border-linha px-4 py-3.5"
          >
            <div className="min-w-0">
              <p className="m-0 font-titulo text-[1.0625rem] text-ink">{passo.rotulo}</p>
              <p className="tipo-caption m-0 mt-1 text-ink-2">{passo.porque}</p>
            </div>
            <Link
              href={passo.href}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Abrir
            </Link>
          </li>
        ))}
      </ol>
    </AdminSection>
  );
}

function Chegada({ base }: { base: string }) {
  return (
    <AdminSection>
      <h2 className="tipo-subtitle m-0 mb-2 text-ink">Como os convidados chegam</h2>
      <p className="tipo-body m-0 mb-5 max-w-[52ch] text-ink-2">
        Eles apontam a câmera para o QR code na mesa. Sem aplicativo, sem senha, sem cadastro.
      </p>
      <Link href={`${base}/qrcode`} className={buttonClasses({ variant: "primary" })}>
        Baixar o QR code
      </Link>
    </AdminSection>
  );
}

export function InicioDoEvento({ ctx }: { ctx: AdminEventPageContext }) {
  const { evento, eventoId, name, canManageCoupleOnly, missoes, checklistStorageKey } = ctx;
  const base = `/admin/e/${eventoId}`;
  const fase = faseDoEvento(evento, new Date());

  const passos = proximosPassos(
    {
      fase,
      temCapa: Boolean(evento.coverImageKey),
      temIdentidade: Object.keys(evento.identityTokens).length > 0,
      missoes,
      convidadosEsperados: evento.expectedGuests,
      gateDefinido: evento.interacaoAbreEm !== null,
    },
    base,
  );

  const preparo = (
    <PreEventPromo
      eventId={evento.eventoId}
      storageKey={checklistStorageKey}
      startsAt={evento.comecaEm}
    />
  );

  const controles = (
    <EventControls
      eventId={evento.eventoId}
      slug={evento.slug}
      plan={evento.plan}
      initial={evento.moderacao}
      initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
      initialStatus={evento.status}
      canManageCoupleOnly={canManageCoupleOnly}
    />
  );

  if (fase === "rascunho") {
    return (
      <div className="flex flex-col gap-5">
        <AdminCard variant="highlight">
          <h2 className="tipo-title m-0 mb-3 text-ink">{name} ainda não está no ar</h2>
          <p className="tipo-body m-0 max-w-[56ch] text-ink-2">
            O Álbora junta as fotos que os convidados tiram na festa. Eles escaneiam o QR da
            mesa e fotografam — sem baixar nada. As fotos aparecem no telão e viram o álbum do
            evento. Prepare o que falta abaixo e publique quando estiver pronto.
          </p>
        </AdminCard>
        <ProximosPassos passos={passos} />
        {preparo}
        {controles}
      </div>
    );
  }

  if (fase === "antes") {
    return (
      <div className="flex flex-col gap-5">
        <AdminCard variant="highlight">
          <p className="tipo-caption m-0 mb-2 text-ink-2">{dataPorExtenso(evento.comecaEm)}</p>
          <h2 className="tipo-title m-0 mb-5 text-ink">{name}</h2>
          <ContagemRegressiva paraISO={evento.comecaEm.toISOString()} />
        </AdminCard>
        <ProximosPassos passos={passos} />
        <Chegada base={base} />
        {preparo}
        {controles}
      </div>
    );
  }

  if (fase === "durante") {
    return (
      <div className="flex flex-col gap-5">
        <LiveSummary eventoId={eventoId} />
        {controles}
        <EventTeamPanel eventId={evento.eventoId} canManageTeam={canManageCoupleOnly} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <AdminCard variant="highlight">
        <h2 className="tipo-title m-0 mb-3 text-ink">A festa acabou</h2>
        <p className="tipo-body m-0 max-w-[56ch] text-ink-2">
          O que os convidados guardaram está aqui. Revise o que quiser esconder, destaque o que
          merece e leve o álbum para onde vocês quiserem.
        </p>
      </AdminCard>
      <LiveSummary eventoId={eventoId} />
      <AdminSection>
        <h2 className="tipo-subtitle m-0 mb-4 text-ink">As memórias</h2>
        <div className="flex flex-wrap gap-3">
          <Link href={`${base}/album`} className={buttonClasses({ variant: "primary" })}>
            Abrir o álbum
          </Link>
          <Link href={`${base}/guests`} className={buttonClasses({ variant: "secondary" })}>
            Ver quem participou
          </Link>
        </div>
      </AdminSection>
    </div>
  );
}
