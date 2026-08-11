import { resolverSlug } from "@albora/db";
import { PACKS, texto } from "@albora/packs";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { Stories } from "./stories";

export const dynamic = "force-dynamic";

/** O evento não é público: quem tem o link entra, quem não tem não acha. */
export const metadata: Metadata = {
  title: "Fotos da festa",
  robots: { index: false, follow: false },
};

/**
 * O casco dos stories. O servidor confere a festa e a sessão; as fotos vêm da
 * rota do feed, que é onde o gate de interação é aplicado.
 *
 * O texto de domínio é resolvido **aqui**, pelo pack. Dentro do componente não
 * entra string de vocabulário nenhuma.
 */
export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolverSlug(banco(), slug, new Date());

  if (r.estado !== "aberto") {
    return <Aviso titulo="Essa festa não está aberta agora" texto="Volte pelo QR da mesa para conferir." />;
  }

  const sessao = await sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);

  // Sessão de outro evento recebe o mesmo texto de sessão nenhuma: dizer "esta
  // sessão é de outra festa" confirmaria que a outra festa existe.
  if (!sessao || sessao.eventoId !== r.evento.eventoId) {
    return (
      <Aviso
        titulo="Entre pela festa primeiro"
        texto="Escaneie o QR da mesa e diga seu nome. Depois as fotos de todo mundo aparecem aqui."
        resgate
      />
    );
  }

  const pack = PACKS[r.evento.packId];

  // Pack fora do catálogo mostra a chave crua, como na tela de captura: bug
  // visível vale mais que tela vazia.
  const vazio = pack ? texto(pack, "telao.vazio") : "telao.vazio";

  return <Stories slug={slug} textos={{ vazio }} />;
}
