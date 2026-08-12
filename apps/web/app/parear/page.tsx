import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { Parear } from "./parear-cliente";

export const dynamic = "force-dynamic";

/**
 * Autorizar o telão (spec 010). O código chega pré-preenchido quando a pessoa
 * escaneia o QR da tela; digitado à mão quando ela abre pelas configurações.
 * Tema neutro da marca — o evento só se revela depois de autorizar, e é a
 * sessão que o define, não esta rota.
 */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const vars = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;

  return (
    <div style={vars}>
      <Parear codigoInicial={(codigo ?? "").toUpperCase()} />
    </div>
  );
}
