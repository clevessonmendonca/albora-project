import React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { faseDoEvento } from "@albora/core";
import { lerRetencaoDoEvento, withEvent } from "@albora/db";
import { getPool } from "@/lib/db";
import { prazosDeRetencao } from "@/features/admin/lib/prazos-de-retencao";
import { montarRetrospectivaServida } from "@/lib/domain/album/retrospectiva";
import { buttonClasses } from "@albora/ui-web";
import { AdminCard, AdminSection } from "@/features/admin/components/server/admin-shell";
import { ContagemRegressiva } from "@/features/admin/components/client/contagem-regressiva";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { LiveSummary } from "@/features/admin/components/client/live-summary";
import { PreEventPromo } from "@/features/admin/components/client/pre-event-promo";
import { PrimeiraVisita } from "@/features/admin/components/client/primeira-visita";
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
              aria-label={passo.rotulo}
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

export async function InicioDoEvento({ ctx }: { ctx: AdminEventPageContext }) {
  const { evento, eventoId, name, canManageCoupleOnly, missoes } = ctx;
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
      sinais={{
        missoes,
        temIdentidade: Object.keys(evento.identityTokens).length > 0,
        convidadosEsperados: evento.expectedGuests,
        planoPago: evento.plan !== "free",
        gateDefinido: evento.interacaoAbreEm !== null,
      }}
      startsAt={evento.comecaEm}
    />
  );

  const controles = (
    <EventControls
      eventId={evento.eventoId}
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
        <PrimeiraVisita />
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
        <PrimeiraVisita />
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
      </div>
    );
  }

  const jobs = await withEvent(getPool(), eventoId, (c) => lerRetencaoDoEvento(c, eventoId));
  const prazos = prazosDeRetencao(jobs);
  const retrospectiva = await montarRetrospectivaServida(eventoId);

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

      {retrospectiva.total > 0 && (
        <AdminSection>
          <h2 className="tipo-subtitle m-0 mb-2 text-ink">A noite em poucas fotos</h2>
          <p className="tipo-body m-0 mb-5 max-w-[52ch] text-ink-2">
            {retrospectiva.sequenciaUnica
              ? "As fotos chegaram todas por volta da mesma hora, então isto é uma sequência, não uma linha do tempo."
              : "Um recorte de cada momento da festa, na ordem em que aconteceu. O que vocês destacaram entra primeiro."}
          </p>

          <ol className="m-0 flex list-none flex-col gap-6 p-0">
            {retrospectiva.momentos.map((momento) => (
              <li key={momento.id}>
                <h3 className="tipo-label m-0 mb-3 text-ink-3">{momento.titulo}</h3>
                <ul className="m-0 grid list-none grid-cols-3 gap-2 p-0">
                  {momento.fotos.map((foto) => (
                    <li key={foto.id} className="relative">
                      <img
                        src={foto.urlThumb}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full rounded-media bg-superficie-alta object-cover object-top"
                      />
                      {foto.destacada && (
                        <span
                          aria-hidden
                          className="absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-acento text-sobre-acento"
                        >
                          <Star size={13} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        </AdminSection>
      )}

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

      {(prazos.exportaEm || prazos.apagaEm || prazos.jaExportou) && (
        <AdminSection>
          <h2 className="tipo-subtitle m-0 mb-2 text-ink">Até quando ficam aqui</h2>
          <p className="tipo-body m-0 mb-4 max-w-[52ch] text-ink-2">
            O Álbora guarda as fotos por um ano. Antes do prazo acabar, elas vão sozinhas para a
            nuvem de vocês — não é preciso lembrar de nada.
          </p>
          <dl className="m-0 flex flex-col gap-3">
            {prazos.jaExportou && prazos.exportouEm && (
              <div className="rounded-token border border-linha px-4 py-3">
                <dt className="tipo-label m-0 text-ink-3">Já foram para a nuvem de vocês</dt>
                <dd className="tipo-body m-0 mt-1 text-ink">{dataPorExtenso(prazos.exportouEm)}</dd>
              </div>
            )}
            {prazos.exportaEm && (
              <div className="rounded-token border border-linha px-4 py-3">
                <dt className="tipo-label m-0 text-ink-3">Vão para a nuvem de vocês</dt>
                <dd className="tipo-body m-0 mt-1 text-ink">{dataPorExtenso(prazos.exportaEm)}</dd>
              </div>
            )}
            {prazos.apagaEm && (
              <div className="rounded-token border border-linha px-4 py-3">
                <dt className="tipo-label m-0 text-ink-3">Saem do Álbora</dt>
                <dd className="tipo-body m-0 mt-1 text-ink">{dataPorExtenso(prazos.apagaEm)}</dd>
                <dd className="tipo-caption m-0 mt-1 text-ink-3">
                  Baixe ou exporte antes desta data se quiser outra cópia.
                </dd>
              </div>
            )}
          </dl>
        </AdminSection>
      )}
    </div>
  );
}
