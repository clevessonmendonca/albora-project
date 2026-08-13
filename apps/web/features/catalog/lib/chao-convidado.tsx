import type { Pack } from "@albora/packs";
import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";

export function ChaoConvidado({
  children,
  fundo,
  pack,
}: {
  children: ReactNode;
  fundo: "claro" | "escuro";
  pack: Pack;
}) {
  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: { ...pack.tokens, fundo } });

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden bg-bg font-corpo text-ink"
      style={paraVariaveis(tokens) as CSSProperties}
    >
      {children}
    </div>
  );
}
