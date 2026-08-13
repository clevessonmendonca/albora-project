import { comEvento, listarDesafios, resolverSlug } from "@albora/db";
import { PACKS, texto } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { PaginaMissoes } from "./pagina-missoes";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Missões",
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

  const sessao = await sessaoDaRequisicao();
  if (!sessao) {
    return (
      <Aviso titulo="Falta você entrar" texto="Volte pelo QR da mesa para ver as missões." />
    );
  }

  const pack = PACKS[r.evento.packId];
  const desafios = await comEvento(banco(), r.evento.eventoId, (c) =>
    listarDesafios(c, r.evento.eventoId, sessao.sessaoId),
  );

  return (
    <div
      style={
        paraVariaveis(
          resolverTokens({
            marca: MARCA_ALBORA,
            pack: { ...(pack?.tokens ?? {}), fundo: "escuro" },
          }),
        ) as CSSProperties
      }
    >
      <PaginaMissoes
        slug={slug}
        missoes={desafios.map((d) => ({
          id: d.id,
          titulo: pack ? texto(pack, d.chaveTitulo) : d.chaveTitulo,
          feito: d.feito,
        }))}
      />
    </div>
  );
}

async function sessaoDaRequisicao() {
  return sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);
}
