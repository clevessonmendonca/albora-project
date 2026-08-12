import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { Entrar } from "./entrar-cliente";

export const dynamic = "force-dynamic";

/**
 * Entrar no painel do anfitrião. Tema neutro da marca — o painel é da conta, não
 * de um evento, então não há identidade de casal aqui. O `m` é o magic link
 * vindo do e-mail; sem ele, a tela pede o e-mail.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const { m } = await searchParams;
  const vars = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;

  return (
    <div style={vars}>
      <Entrar magic={m ?? null} />
    </div>
  );
}
