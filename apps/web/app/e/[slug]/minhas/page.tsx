import { resolverSlug } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { CSSProperties } from "react";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { Aviso } from "../aviso";
import { PaginaMinhas } from "./pagina-minhas";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Minhas fotos",
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
      <Aviso titulo="Falta você entrar" texto="Volte pelo QR da mesa para ver suas fotos." />
    );
  }

  const pack = PACKS[r.evento.packId];
  const vars = paraVariaveis(
    resolverTokens({ marca: MARCA_ALBORA, ...(pack ? { pack: pack.tokens } : {}) }),
  ) as CSSProperties;

  return (
    <div style={vars}>
      <PaginaMinhas slug={slug} eventoId={sessao.eventoId} sessaoId={sessao.sessaoId} />
    </div>
  );
}
