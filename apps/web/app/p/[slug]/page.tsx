import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { eventVars } from "@/features/guest/lib/event-vars";
import { getPublicEventMetadata } from "@/features/public-event/data/get-public-event-metadata";
import { getPublicEventPage } from "@/features/public-event/data/get-public-event-page";
import { PublicEventView } from "@/features/public-event/components/server/public-event-view";

/** SEO de marca por evento — separada de `/e/[slug]` (que é `robots: index: false`); `revalidate: 60` evita consulta ao banco em cada hit de crawler. */
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
