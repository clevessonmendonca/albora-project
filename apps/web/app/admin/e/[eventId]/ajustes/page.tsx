import React from "react";
import Link from "next/link";
import type { PlanoDoEvento } from "@albora/core";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import {
  acaoTextual,
  CabecalhoDeCartao,
  Cartao,
  Etiqueta,
  FaixaDeDestaque,
  IntroDaPagina,
} from "@/features/admin/components/server/kit-do-painel";
import { EventControls } from "@/features/admin/components/client/event-controls";
import { EventMusic } from "@/features/admin/components/client/event-music";
import { EventTeamPanel } from "@/features/admin/components/client/event-team-panel";
import { EncerrarEvento } from "@/features/admin/components/client/encerrar-evento";
import { SupportHelpButton } from "@/features/admin/components/client/support-help-button";

export const dynamic = "force-dynamic";

const ROTULO_PLANO: Record<PlanoDoEvento, string> = {
  free: "Gratuito",
  celebration: "Completo",
  vendor: "Fornecedor",
};

function dataPorExtenso(quando: Date, fuso: string): string {
  return quando.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: fuso,
  });
}

export default async function PaginaAjustes({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId}>
      {({ evento, name, canManageCoupleOnly }) => (
        <>
          <IntroDaPagina
            eyebrow="Tudo sob controle"
            titulo="Configurações"
            subtitulo="O que os convidados podem fazer, os dados do evento e onde pedir ajuda."
          />
          <FaixaDeDestaque
            eyebrow="Controle do evento"
            titulo="As regras da festa, num só lugar."
            descricao="Privacidade, moderação e os dados que aparecem para os convidados."
          />

          <div className="flex max-w-[900px] flex-col gap-5">
            <Cartao>
              <CabecalhoDeCartao
                titulo="Privacidade e moderação"
                subtitulo="O que muda pra quem está enviando fotos."
              />
              <div className="flex flex-col divide-y divide-linha">
                <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                  <div className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">
                      Aprovar fotos antes do telão
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">
                      Toda foto passa por revisão antes de entrar na parede.
                    </span>
                  </div>
                  <Etiqueta tom="positivo">Ativado</Etiqueta>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <span className="block text-[13px] font-semibold text-ink">
                      Permitir envio pelos convidados
                    </span>
                    <span className="mt-0.5 block text-[12px] text-ink-3">
                      Sem login, sem app — direto da câmera de quem está na festa.
                    </span>
                  </div>
                  <Etiqueta tom="positivo">Ativado</Etiqueta>
                </div>
                <div className="py-3 last:pb-0">
                  <EventControls
                    eventId={evento.eventoId}
                    plan={evento.plan}
                    initial={evento.moderacao}
                    initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
                    initialStatus={evento.status}
                    canManageCoupleOnly={canManageCoupleOnly}
                    modo="aoVivo"
                    apenas={["telao"]}
                    estiloTelao="linha"
                  />
                </div>
              </div>
            </Cartao>

            <EventControls
              eventId={evento.eventoId}
              plan={evento.plan}
              initial={evento.moderacao}
              initialInteractionOpensAt={evento.interacaoAbreEm?.toISOString() ?? null}
              initialStatus={evento.status}
              canManageCoupleOnly={canManageCoupleOnly}
              modo="regras"
              apenas={["protecoes", "upgrade"]}
            />

            <Cartao>
              <CabecalhoDeCartao
                titulo="Evento"
                acao={
                  <Link href={`/admin/e/${eventId}/identity`} className={acaoTextual}>
                    Editar
                  </Link>
                }
              />
              <div className="flex flex-col divide-y divide-linha">
                <LinhaDeEvento rotulo="Nome" valor={name} />
                <LinhaDeEvento
                  rotulo="Data"
                  valor={dataPorExtenso(evento.comecaEm, evento.fuso)}
                />
                <LinhaDeEvento rotulo="Plano" valor={ROTULO_PLANO[evento.plan]} />
              </div>
            </Cartao>

            <EventMusic eventId={evento.eventoId} />

            <EventTeamPanel eventId={evento.eventoId} canManageTeam={canManageCoupleOnly} />

            <Cartao>
              <CabecalhoDeCartao
                titulo="Consentimento e retenção"
                subtitulo="Versões aceitas pelos convidados e prazos de exportação e exclusão."
              />
              <p className="m-0 mb-4 text-[13px] text-ink-2">
                Auditoria LGPD: quantos convidados aceitaram cada versão do consentimento, sem
                nomes individuais, e quando as fotos deste evento saem daqui.
              </p>
              <Link href={`/admin/e/${eventId}/consent`} className={acaoTextual}>
                Ver consentimento e retenção →
              </Link>
            </Cartao>

            <Cartao id="como-funciona">
              <CabecalhoDeCartao titulo="Ajuda" subtitulo="Fala com a equipe Albora." />
              <p className="m-0 mb-4 text-[13px] text-ink-2">
                O convidado escaneia o QR, digita o primeiro nome e já pode enviar fotos — sem
                conta, sem senha. Precisando de ajuda com o evento, abra um chamado.
              </p>
              <SupportHelpButton eventId={evento.eventoId} />
            </Cartao>

            {canManageCoupleOnly && (
              <EncerrarEvento eventId={evento.eventoId} status={evento.status} />
            )}
          </div>
        </>
      )}
    </EventPageLayout>
  );
}

function LinhaDeEvento({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <span className="text-[13px] text-ink-3">{rotulo}</span>
      <span className="text-[13px] font-medium text-ink">{valor}</span>
    </div>
  );
}
