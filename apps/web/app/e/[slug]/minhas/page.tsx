import type { Metadata } from "next";
import { resolveOpenEvent } from "@/features/guest/data/resolve-open-event";
import { guestSession } from "@/features/guest/data/guest-session";
import { eventVars } from "@/features/guest/lib/event-vars";
import { Aviso } from "../aviso";
import { SemEntrada } from "../sem-entrada";
import { PaginaMinhas } from "./pagina-minhas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas fotos",
  robots: { index: false, follow: false },
};

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolveOpenEvent(slug);

  if (r.estado !== "aberto") {
    return (
      <Aviso titulo="Essa festa não está aberta agora" texto="Volte pelo QR da mesa para conferir." />
    );
  }

  const sessao = await guestSession();
  if (!sessao) return <SemEntrada slug={slug} />;

  return (
    <div style={eventVars(r.evento)}>
      <PaginaMinhas
        slug={slug}
        eventoId={sessao.eventoId}
        sessaoId={sessao.sessaoId}
        cameraPath={`/e/${encodeURIComponent(slug)}/foto`}
      />
    </div>
  );
}
