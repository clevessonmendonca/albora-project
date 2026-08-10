import { MARCA_ALBORA, paraVariaveis, resolverTokens } from "@albora/tokens";
import { CASAMENTO } from "@albora/packs";
import type { Metadata } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Albora",
  description: "O álbum coletivo da sua festa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Esqueleto: o evento real entra na 003, com os tokens vindo do banco.
  // O que importa aqui é que já existe UM ponto de resolução, e nenhum
  // componente abaixo escolhe cor.
  const tokens = resolverTokens({ marca: MARCA_ALBORA, pack: CASAMENTO.tokens ?? {} });

  return (
    <html lang="pt-BR">
      <body style={paraVariaveis(tokens) as CSSProperties}>{children}</body>
    </html>
  );
}
