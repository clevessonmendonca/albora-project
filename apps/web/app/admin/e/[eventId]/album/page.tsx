import React from "react";
import Link from "next/link";
import {
  listarComentariosParaRevisao,
  listarDestaques,
  listarMidiaDoAlbum,
  listarMidiaParaRevisao,
  withEvent,
} from "@albora/db";
import { getPool } from "@/lib/db";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import { HostAlbum } from "@/features/admin/components/client/host-album";
import { ModerationPage } from "@/features/admin/components/client/moderation-page";
import { AlbumBarraDeFiltros } from "@/features/admin/components/server/album-barra-de-filtros";
import { ABAS_FOTOS, abaAtiva, type AbaFotosId } from "@/features/admin/lib/abas-fotos";
import {
  Aviso,
  botaoDoPainel,
  FaixaDeDestaque,
  IntroDaPagina,
} from "@/features/admin/components/server/kit-do-painel";

export const dynamic = "force-dynamic";

export default async function PaginaFotos({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ aba?: string }>;
}) {
  const { eventId } = await params;
  const { aba } = await searchParams;
  const ativa = abaAtiva(aba);

  return (
    <EventPageLayout eventId={eventId}>
      {async ({ canManageCoupleOnly }) => {
        // Só consulta o banco depois que `EventPageLayout` resolveu `loadEventPage` —
        // é o `roleForAccountOnEvent` ali que garante que este host pode ver este evento.
        // RLS isola dados entre eventos, mas não decide se ESTE host tem acesso a ESTE evento.
        const [midias, destaques, filaMidias, filaComentarios] = await withEvent(
          getPool(),
          eventId,
          (c) =>
            Promise.all([
              listarMidiaDoAlbum(c, eventId),
              listarDestaques(c, eventId),
              listarMidiaParaRevisao(c, eventId),
              listarComentariosParaRevisao(c, eventId),
            ]),
        );

        const contagens: Record<AbaFotosId, number> = {
          todas: midias.length,
          destaques: destaques.length,
          revisar: filaMidias.length + filaComentarios.length,
        };

        return (
          <>
            <IntroDaPagina
              eyebrow="Memórias"
              titulo="Álbum"
              subtitulo="As fotos que os convidados foram enviando ao vivo, num só lugar."
              acao={
                <Link
                  href={`/admin/e/${eventId}/qrcode`}
                  className={botaoDoPainel({ variant: "primary" })}
                >
                  Como receber fotos
                </Link>
              }
            />
            <FaixaDeDestaque
              eyebrow="ÁLBUM DE MEMÓRIAS"
              titulo="Tudo o que a festa registrou, num só lugar."
              descricao="Sem posar, sem esperar fotógrafo oficial — só quem estava lá, mostrando o que viu."
            />
            <AlbumBarraDeFiltros
              base={`/admin/e/${eventId}/album`}
              itens={ABAS_FOTOS}
              ativa={ativa}
              contagens={contagens}
            />

            {ativa === "revisar" ? (
              <ModerationPage eventoId={eventId} />
            ) : (
              <HostAlbum
                eventoId={eventId}
                canExport={canManageCoupleOnly && ativa === "todas"}
                filtro={ativa === "destaques" ? "destaques" : "todas"}
              />
            )}

            <Aviso
              titulo="Cada evento tem seu próprio álbum"
              descricao="Fotos e destaques ficam isolados por evento — nada se mistura entre festas diferentes."
              acao={
                <Link
                  href={`/admin/e/${eventId}/qrcode`}
                  className={botaoDoPainel({ variant: "light" })}
                >
                  Compartilhar convite
                </Link>
              }
            />
          </>
        );
      }}
    </EventPageLayout>
  );
}
