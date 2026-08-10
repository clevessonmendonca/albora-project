import { resolverSlug } from "@albora/db";
import { banco } from "@/lib/banco";
import { Aviso } from "../aviso";
import { PaginaFoto } from "./pagina-foto";

export const dynamic = "force-dynamic";

/**
 * A tela de captura só existe dentro de uma festa aberta. O servidor confere
 * o slug de novo aqui — não porque o convidado veio de outra tela, mas porque
 * ele pode ter deixado a aba aberta a noite toda e voltado depois do fim.
 */
export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolverSlug(banco(), slug, new Date());

  if (r.estado !== "aberto") {
    return (
      <Aviso
        titulo="Essa festa não está aberta agora"
        texto="Volte pelo QR da mesa para conferir."
      />
    );
  }

  return <PaginaFoto eventoId={r.evento.eventoId} />;
}
