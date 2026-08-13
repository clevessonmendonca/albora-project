import { comEvento, listarDesafios, resolverSlug } from "@albora/db";
import { PACKS, texto, type Pack } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { SemEntrada } from "../sem-entrada";
import { PaginaFeed } from "./pagina-feed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Fotos da festa",
  // O evento não é público: quem tem o link entra, quem não tem não acha.
  robots: { index: false, follow: false },
};

/**
 * O feed do evento.
 *
 * As missões chegam **resolvidas** ao componente — quem traduz chave de
 * vocabulário é o pack, aqui. O que a página deliberadamente **não** faz é
 * decidir o que o convidado pode ver: o gate de interação é regra do servidor
 * da rota `/api/feed`, e uma segunda decisão aqui divergiria dela.
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

  const { eventoId, packId } = r.evento;
  const pack = PACKS[packId];

  const sessao = await sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) return <SemEntrada slug={slug} />;

  const desafios = await comEvento(banco(), eventoId, (c) =>
    listarDesafios(c, eventoId, sessao.sessaoId),
  );

  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: { ...(pack?.tokens ?? {}), fundo: "escuro" },
  });

  return (
    <div style={paraVariaveis(tokens) as CSSProperties}>
      <PaginaFeed
        slug={slug}
        tituloEvento={pack ? texto(pack, "landing.exemplo.nome") : "A festa"}
        missoes={desafios.map((d) => ({
          id: d.id,
          titulo: pack ? texto(pack, d.chaveTitulo) : d.chaveTitulo,
        }))}
        textos={{ missaoTitulo: rotulo(pack, "missao.titulo") }}
        caminhoDaCamera={`/e/${encodeURIComponent(slug)}/foto`}
      />
    </div>
  );
}

/**
 * Pack ausente é evento apontando para um pack que saiu do catálogo. A chave
 * crua aparece, que é bug visível em vez de tela vazia.
 */
function rotulo(pack: Pack | undefined, chave: string): string {
  return pack ? texto(pack, chave) : chave;
}
