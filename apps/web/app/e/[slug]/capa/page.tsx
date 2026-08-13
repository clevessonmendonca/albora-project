import { comEvento, packDoEvento, resolverSlug } from "@albora/db";
import { PACKS, texto } from "@albora/packs";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { banco } from "@/lib/banco";
import { montarAlbumServido } from "@/lib/album";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { PaginaCapa } from "./pagina-capa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "A festa",
  robots: { index: false, follow: false },
};

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await resolverSlug(banco(), slug, new Date());

  if (r.estado !== "aberto") {
    return (
      <Aviso titulo="Essa festa não está aberta agora" texto="Volte pelo QR da mesa para conferir." />
    );
  }

  const sessao = await sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao) {
    return (
      <Aviso titulo="Falta você entrar" texto="Volte pelo QR da mesa para ver a festa." />
    );
  }

  const packId = await comEvento(banco(), sessao.eventoId, (c) => packDoEvento(c, sessao.eventoId));
  const pack = packId ? PACKS[packId] : undefined;
  const album = await montarAlbumServido(sessao.eventoId);
  const momentos = (pack?.momentos ?? []).slice(0, 5).map((m) => ({
    id: m.id,
    titulo: pack ? texto(pack, m.chaveTitulo) : m.id,
  }));
  const interacaoAberta =
    r.evento.interacaoAbreEm === null || r.evento.interacaoAbreEm.getTime() <= Date.now();

  return (
    <PaginaCapa
      slug={slug}
      nomeEvento={pack ? texto(pack, "landing.exemplo.nome") : "A festa"}
      comecaEm={r.evento.comecaEm.toISOString()}
      album={album}
      momentos={momentos}
      interacaoAberta={interacaoAberta}
    />
  );
}
