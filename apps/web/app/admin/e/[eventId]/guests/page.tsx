import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { eventEntryUrl } from "@/lib/qr";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { GuestFunnel } from "@/features/admin/components/client/guest-funnel";
import { ConvidadosCartaoConvite } from "@/features/admin/components/server/convidados-cartao-convite";
import {
  botaoDoPainel,
  CabecalhoDeCartao,
  Cartao,
  ColunaDeApoio,
  FaixaDeDestaque,
  GradeDePaineis,
  IntroDaPagina,
} from "@/features/admin/components/server/kit-do-painel";

export const dynamic = "force-dynamic";

export default async function PaginaConvidados({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  return (
    <EventPageLayout eventId={eventId}>
      {async ({ evento }) => {
        const hdrs = await headers();
        const host = hdrs.get("host") ?? "localhost";
        const proto = host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https";
        const origin = `${proto}://${host}`;
        const urlDeConvite = eventEntryUrl(origin, evento.slug, "link");

        return (
          <>
            <IntroDaPagina
              eyebrow="Pessoas"
              titulo="Convidados"
              subtitulo="Quem já está no evento, e como convidar quem ainda falta."
            />
            <FaixaDeDestaque
              eyebrow="CADA PESSOA, UM OLHAR"
              titulo="Cada convidado enxerga a festa de um jeito."
              descricao="Sem conta, sem senha: quem aponta a câmera para o QR já está participando."
              acao={
                <Link
                  href={`/admin/e/${eventId}/qrcode`}
                  className={botaoDoPainel({ variant: "gold" })}
                >
                  Abrir convite →
                </Link>
              }
            />
            <GradeDePaineis>
              <GuestFunnel eventoId={eventId} />
              <ColunaDeApoio>
                <ConvidadosCartaoConvite eventId={eventId} url={urlDeConvite} />
                <Cartao>
                  <CabecalhoDeCartao titulo="Permissões" />
                  <p className="m-0 mb-4 text-[13px] text-ink-3">
                    Consentimento, moderação e quem pode ver o quê ficam nas configurações do
                    evento.
                  </p>
                  <Link
                    href={`/admin/e/${eventId}/ajustes`}
                    className={botaoDoPainel({ variant: "light", width: "full" })}
                  >
                    Ajustar privacidade
                  </Link>
                </Cartao>
              </ColunaDeApoio>
            </GradeDePaineis>
          </>
        );
      }}
    </EventPageLayout>
  );
}
