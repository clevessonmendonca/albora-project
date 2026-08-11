import { comEvento, listarDesafios, resolverSlug } from "@albora/db";
import { PACKS, texto, type Pack } from "@albora/packs";
import { cookies } from "next/headers";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { PaginaFoto } from "./pagina-foto";

export const dynamic = "force-dynamic";

/**
 * A tela de captura só existe dentro de uma festa aberta. O servidor confere
 * o slug de novo aqui — não porque o convidado veio de outra tela, mas porque
 * ele pode ter deixado a aba aberta a noite toda e voltado depois do fim.
 *
 * Missões e lugares chegam **resolvidos** no componente. Quem traduz chave de
 * vocabulário é o pack, aqui; dentro do componente não entra string de
 * domínio nenhuma.
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

  const { eventoId, packId, filtroRecomendado } = r.evento;
  const pack = PACKS[packId];

  const sessao = await sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);

  const desafios = await comEvento(banco(), eventoId, (c) =>
    listarDesafios(c, eventoId, sessao?.sessaoId ?? null),
  );

  return (
    <PaginaFoto
      eventoId={eventoId}
      caminhoDoFeed={`/e/${encodeURIComponent(slug)}/feed`}
      filtroRecomendado={filtroRecomendado}
      missoes={desafios.map((d) => ({
        id: d.id,
        titulo: pack ? texto(pack, d.chaveTitulo) : d.chaveTitulo,
        feito: d.feito,
      }))}
      lugares={lugaresDoPack(pack)}
      textos={{
        missaoTitulo: rotulo(pack, "missao.titulo"),
        missaoLivre: rotulo(pack, "missao.livre"),
        lugarPergunta: rotulo(pack, "lugar.pergunta"),
      }}
    />
  );
}

function lugaresDoPack(pack: Pack | undefined) {
  if (!pack) return [];
  return pack.lugares.map((l) => ({ id: l.id, titulo: texto(pack, l.chaveTitulo) }));
}

/**
 * Pack ausente é evento apontando para um pack que saiu do catálogo. A tela
 * continua funcionando — a foto é o que importa — e a chave crua aparece, que
 * é bug visível em vez de tela vazia.
 */
function rotulo(pack: Pack | undefined, chave: string): string {
  return pack ? texto(pack, chave) : chave;
}
