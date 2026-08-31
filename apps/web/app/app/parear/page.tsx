import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { PairApp } from "@/features/pairing/components/client/pair-app-client";

export const dynamic = "force-dynamic";

export default function PairAppPage() {
  const vars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;
  return (
    <div style={vars}>
      <PairApp />
    </div>
  );
}
