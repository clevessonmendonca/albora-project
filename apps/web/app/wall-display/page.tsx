import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { WallClient } from "@/features/wall/components/client/wall-client";

export const dynamic = "force-dynamic";

/** Sem slug nem token — a TV não pertence a nenhum evento até o pareamento; o tema do casal chega com o crachá. */
export default function WallDisplayPage() {
  const neutro = toVariables(
    resolveTokens({ marca: ALBORA_BRAND, pack: { background: "dark" } }),
  );

  return <WallClient initialVars={neutro} />;
}
