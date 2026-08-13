import { comEvento, listarDesafios, packDoEvento, resolverSlug, musicaDoCasal } from "@albora/db";
import { exibirMusica } from "@albora/core";
import { PACKS, texto, type Pack } from "@albora/packs";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { banco } from "@/lib/banco";
import { montarAlbumServido } from "@/lib/album";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { SemEntrada } from "../sem-entrada";
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
  if (!sessao) return <SemEntrada slug={slug} />;

  const desafios = await comEvento(banco(), sessao.eventoId, (c) =>
    listarDesafios(c, sessao.eventoId, sessao.sessaoId),
  );

  const packId = await comEvento(banco(), sessao.eventoId, (c) => packDoEvento(c, sessao.eventoId));
  const pack = packId ? PACKS[packId] : undefined;
  const album = await montarAlbumServido(sessao.eventoId);
  const escolhida = await comEvento(banco(), sessao.eventoId, (c) =>
    musicaDoCasal(c, sessao.eventoId),
  );
  const musicaRotulo = escolhida
    ? exibirMusica(escolhida.link, escolhida.metadado).rotulo
    : null;
  const momentos = (pack?.momentos ?? []).slice(0, 5).map((m) => ({
    id: m.id,
    titulo: pack ? texto(pack, m.chaveTitulo) : m.id,
    filtroMissaoId: missaoDoMomento(pack, m.id, desafios),
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
      musicaRotulo={musicaRotulo}
    />
  );
}

function missaoDoMomento(
  pack: Pack | undefined,
  momentoId: string,
  desafios: { id: string; chaveTitulo: string }[],
): string | null {
  if (!pack) return null;
  const template = pack.missoes.find((m) => m.id === momentoId);
  if (!template) return null;
  return desafios.find((d) => d.chaveTitulo === template.chaveTitulo)?.id ?? null;
}
