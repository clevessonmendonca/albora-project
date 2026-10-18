import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { WallLinkClient } from "@/features/wall-pairing/components/client/wall-link-client";

export const dynamic = "force-dynamic";

/** O segredo do link vem no fragmento (#), que o navegador não envia ao servidor nem ao Referer; o cliente o troca por um cookie e limpa a URL. */
export default function Pagina() {
  const vars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;
  return (
    <div style={vars}>
      <WallLinkClient />
    </div>
  );
}
