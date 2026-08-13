import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { PaginaEscanear } from "./pagina-escanear";

export const metadata: Metadata = {
  title: "Entrar na festa",
  robots: { index: false, follow: false },
};

export default function Pagina() {
  const vars = paraVariaveis(resolverTokens({ marca: MARCA_ALBORA })) as CSSProperties;

  return (
    <div style={{ ...vars, minHeight: "100dvh" }}>
      <PaginaEscanear />
    </div>
  );
}
