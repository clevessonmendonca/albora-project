import React from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { MonitorPlay } from "lucide-react";
import { EventPageLayout } from "@/features/admin/components/server/event-page-layout";
import {
  Aviso,
  botaoDoPainel,
  CabecalhoDeCartao,
  Cartao,
  ColunaDeApoio,
  GradeDePaineis,
  IntroDaPagina,
} from "@/features/admin/components/server/kit-do-painel";

export const dynamic = "force-dynamic";

export default async function PaginaTelao({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const cabecalhos = await headers();
  const host = cabecalhos.get("host") ?? "";
  const protocolo = cabecalhos.get("x-forwarded-proto") ?? "https";
  const telao = host ? `${protocolo}://${host}/wall-display` : "/wall-display";

  return (
    <EventPageLayout eventId={eventId}>
      {(ctx) => (
        <>
          <IntroDaPagina
            eyebrow="Ao vivo"
            titulo="Telão"
            subtitulo="A tela do salão mostrando as fotos conforme elas chegam."
            acao={
              <a
                href={telao}
                target="_blank"
                rel="noopener noreferrer"
                className={botaoDoPainel({ variant: "primary" })}
              >
                <MonitorPlay size={16} aria-hidden />
                Visualizar telão
              </a>
            }
          />

          <GradeDePaineis>
            <Cartao>
              <CabecalhoDeCartao
                titulo="Prévia"
                subtitulo="É isto que aparece na tela do salão."
              />
              <div className="grid aspect-video place-items-center rounded-xl bg-gradient-chao-quente text-center">
                <div>
                  <p className="m-0 font-[family-name:var(--fonte-titulo)] text-[clamp(1.5rem,4vw,2.5rem)] text-ink">
                    {ctx.name}
                  </p>
                  <p className="m-0 mt-2 text-[13px] text-ink-3">
                    As fotos entram aqui assim que os convidados enviam.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={telao}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={botaoDoPainel({ variant: "light" })}
                >
                  Abrir visualização
                </a>
                <Link
                  href={`/admin/e/${eventId}/album`}
                  className={botaoDoPainel({ variant: "light" })}
                >
                  Selecionar fotos
                </Link>
              </div>
            </Cartao>

            <ColunaDeApoio>
              <Cartao>
                <CabecalhoDeCartao
                  titulo="Controle da exibição"
                  subtitulo="O que o telão pode mostrar."
                />
                <p className="m-0 text-[13px] text-ink-2">
                  Só foto aprovada vai para a parede. A fila de revisão fica no álbum.
                </p>
                <Link
                  href={`/admin/e/${eventId}/album?aba=revisar`}
                  className={`${botaoDoPainel({ variant: "light", width: "full" })} mt-4`}
                >
                  Revisar fotos
                </Link>
              </Cartao>
            </ColunaDeApoio>
          </GradeDePaineis>

          <Aviso
            titulo="Conecte a um projetor ou TV"
            descricao="Abra o link num computador ligado à tela do salão e deixe em tela cheia."
            acao={
              <a
                href={telao}
                target="_blank"
                rel="noopener noreferrer"
                className={botaoDoPainel({ variant: "light" })}
              >
                Abrir o telão
              </a>
            }
          />
        </>
      )}
    </EventPageLayout>
  );
}
