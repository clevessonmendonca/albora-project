import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { CSSProperties } from "react";
import { WallPairClient } from "@/features/wall-pairing/components/client/wall-pair-client";

export const dynamic = "force-dynamic";

/** Código pré-preenchido pelo QR ou digitado à mão — tema neutro até autorizar; o evento é definido pela sessão, não por esta rota. */
export default async function Pagina({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  const vars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;

  return (
    <div style={vars}>
      <WallPairClient initialCode={(codigo ?? "").toUpperCase()} />
    </div>
  );
}
