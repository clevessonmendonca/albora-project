import type { Pack } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import type { CSSProperties, ReactNode } from "react";

export function GuestBackground({
  children,
  fundo,
  pack,
}: {
  children: ReactNode;
  fundo: "claro" | "escuro";
  pack: Pack;
}) {
  const tokens = resolveTokens({ marca: ALBORA_BRAND, pack: { ...pack.tokens, fundo } });

  return (
    <div
      className="absolute inset-0 flex flex-col overflow-hidden bg-bg font-corpo text-ink"
      style={toVariables(tokens) as CSSProperties}
    >
      {children}
    </div>
  );
}
