import { comEvento, packDoEvento, resolverSlug } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { montarAlbumServido } from "@/lib/album";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { AlbumComAbas } from "./album-com-abas";
import { Aviso } from "../aviso";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "O álbum da noite",
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
      <Aviso titulo="Falta você entrar" texto="Volte pelo QR da mesa para ver o álbum da festa." />
    );
  }

  const packId = await comEvento(banco(), sessao.eventoId, (c) => packDoEvento(c, sessao.eventoId));
  const pack = packId ? PACKS[packId] : undefined;
  const album = await montarAlbumServido(sessao.eventoId);

  const tokens = resolverTokens({
    marca: MARCA_ALBORA,
    pack: { ...(pack?.tokens ?? {}), fundo: "escuro" },
  });

  return (
    <div style={paraVariaveis(tokens) as CSSProperties}>
      <AlbumComAbas slug={slug} album={album} />
    </div>
  );
}
