import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { PairApp } from "@/features/pairing/components/client/pair-app-client";

export const dynamic = "force-dynamic";

export default function Pagina() {
  const vars = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;
  return (
    <div style={vars}>
      <PairApp />
    </div>
  );
}
