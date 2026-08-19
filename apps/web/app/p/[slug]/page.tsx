import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eventVars } from "@/features/guest/lib/event-vars";
import { getPublicEventMetadata } from "@/features/public-event/data/get-public-event-metadata";
import { getPublicEventPage } from "@/features/public-event/data/get-public-event-page";
import { PublicEventView } from "@/features/public-event/components/server/public-event-view";

/**
 * A vitrine pública do evento (C1 do mapa de crescimento) — prova social,
 * um gostinho do álbum já moderado, e o CTA "monte o seu".
 *
 * Superfície nova, deliberadamente separada de `/e/[slug]` (a entrada do
 * convidado, sem sessão e `robots: { index: false }` por desenho — ver o
 * comentário lá). Esta rota é o oposto: SEO de marca por evento, cada
 * casamento como porta de entrada indexada — nunca cauda longa. `revalidate`
 * mantém o número de fotos razoavelmente fresco sem consultar o banco a cada
 * hit de crawler.
 */
export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dados = await getPublicEventMetadata(slug);

  if (!dados) {
    return { title: "Albora", robots: { index: false } };
  }

  const descricao = "O álbum coletivo da festa — fotos moderadas, enviadas por quem estava lá.";

  return {
    title: `${dados.nomeDoEvento} · Albora`,
    description: descricao,
    openGraph: { title: dados.nomeDoEvento, description: descricao },
  };
}

export default async function PaginaPublicaDoEvento({ params }: Props) {
  const { slug } = await params;
  const dados = await getPublicEventPage(slug);

  if (!dados) notFound();

  return (
    <div style={eventVars(dados.evento, "light")}>
      <PublicEventView
        estado={dados.estado}
        nomeDoEvento={dados.nomeDoEvento}
        dataDoEvento={dados.dataDoEvento}
        mensagemVazia={dados.mensagemVazia}
        totalFotos={dados.totalFotos}
        totalPessoas={dados.totalPessoas}
        vitrine={dados.vitrine}
        ctaHref={dados.ctaHref}
      />
    </div>
  );
}
