import React from "react";
import {
  CabecalhoDeCartao,
  Cartao,
  ColunaDeApoio,
  GradeDePaineis,
  IntroDaPagina,
  NotaVazia,
} from "@/features/admin/components/server/kit-do-painel";
import { CopiarLinkEvento } from "@/features/admin/components/client/copiar-link-evento";
import { EventLink } from "@/features/admin/components/client/event-link";
import { EventPieces } from "@/features/admin/components/client/event-pieces";
import { QrCodePrint } from "@/features/admin/components/client/qr-code-print";
import { QrProofSheet } from "@/features/admin/components/client/qr-proof-sheet";

type Props = {
  eventId: string;
  slug: string;
  eventName: string;
  guestUrl: string;
  whatsappUrl: string;
  svgString: string;
  comecaEm: Date;
  fuso: string;
};

function dataPorExtenso(quando: Date, fuso: string): string {
  return quando.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: fuso,
  });
}

export function CompartilharEvento({
  eventId,
  slug,
  eventName,
  guestUrl,
  whatsappUrl,
  svgString,
  comecaEm,
  fuso,
}: Props) {
  return (
    <>
      <IntroDaPagina
        eyebrow="Compartilhe"
        titulo="QR e convite"
        subtitulo="O convidado aponta a câmera pro QR ou toca no link — sem baixar aplicativo, sem criar conta, sem senha."
        acao={<CopiarLinkEvento slug={slug} />}
      />

      <GradeDePaineis>
        <div className="flex flex-col gap-5">
          <QrCodePrint
            eventId={eventId}
            slug={slug}
            eventName={eventName}
            guestUrl={guestUrl}
            svgString={svgString}
          />

          <Cartao>
            <CabecalhoDeCartao
              titulo="Mais um jeito de mandar"
              subtitulo="Pra quem prefere abrir o WhatsApp direto."
            />
            <EventLink title="Convite por WhatsApp" url={whatsappUrl} />
          </Cartao>
        </div>

        <ColunaDeApoio>
          <Cartao className="text-center">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-acento-texto">
              Vocês estão convidados
            </div>
            <h2 className="m-0 font-[family-name:var(--fonte-titulo)] text-[1.75rem] leading-tight text-ink">
              {eventName}
            </h2>
            <p className="m-0 mt-2 text-[13px] text-ink-2">{dataPorExtenso(comecaEm, fuso)}</p>
            <p className="m-0 mt-4 text-[13px] leading-relaxed text-ink-2">
              Guardem esse dia com a gente — cada foto que vocês tirarem cai aqui, no mesmo
              instante em que ela é enviada.
            </p>
            <div className="mt-4 text-left">
              <NotaVazia>Prévia visual do cartão de convite.</NotaVazia>
            </div>
          </Cartao>
        </ColunaDeApoio>
      </GradeDePaineis>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Cartao>
          <CabecalhoDeCartao
            titulo="Peças para imprimir"
            subtitulo="Placa, adesivo e cards de mesa pra distribuir pelo salão — uma placa só na entrada não é vista por quem já sentou."
          />
          <EventPieces eventId={eventId} slug={slug} />
        </Cartao>

        <QrProofSheet eventId={eventId} />
      </div>
    </>
  );
}
