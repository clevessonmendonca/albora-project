import { resolverSlug } from "@albora/db";
import { PACKS } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";
import { cookies } from "next/headers";
import { banco } from "@/lib/banco";
import { COOKIE_SESSAO, sessaoDoToken } from "@/lib/sessao";
import { FilaGlobal } from "./fila-global";

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = await resolverSlug(banco(), slug, new Date());

  if (r.estado !== "aberto") return children;

  const pack = PACKS[r.evento.packId];
  const vars = paraVariaveis(
    resolverTokens({ marca: MARCA_ALBORA, ...(pack ? { pack: pack.tokens } : {}) }),
  ) as CSSProperties;

  const sessao = await sessaoDoToken((await cookies()).get(COOKIE_SESSAO)?.value);
  const comSessao = sessao?.eventoId === r.evento.eventoId;

  return (
    <div style={vars}>
      {comSessao && <FilaGlobal eventoId={sessao.eventoId} />}
      {children}
    </div>
  );
}
