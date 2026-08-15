import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ScanPage } from "@/features/guest/components/client/scan-page";

export const metadata: Metadata = {
  title: "Entrar na festa",
  robots: { index: false, follow: false },
};

export default function GuestScanPage() {
  const vars = toVariables(resolveTokens({ marca: ALBORA_BRAND })) as CSSProperties;

  return (
    <div style={{ ...vars, minHeight: "100dvh" }}>
      <ScanPage />
    </div>
  );
}
