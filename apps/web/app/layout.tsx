import "./tailwind.css";
import "./tipografia.css";
import "./base.css";
import "./fontes.css";
import { ALBORA_BRAND, toVariables, resolveTokens } from "@albora/tokens";
import { WEDDING } from "@albora/packs";
import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";

export const metadata: Metadata = {
  title: "Albora",
  description: "O álbum coletivo da sua festa.",
  metadataBase: new URL("https://albora.com.br"),
  openGraph: {
    siteName: "Albora",
    locale: "pt_BR",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  // Sem `manifest` aqui de propósito: quem o declara é a rota do convidado,
  // porque é o PWA dele que se instala. O admin e o telão não.
  icons: {
    // A família do ponto, não a da estrela: abaixo de ~40px a cintura do
    // losango fecha e vira borrão (`DESIGN.md` §1b).
    icon: "/favicon.svg",
    apple: "/icone-app-512.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Esqueleto: evento real entra na 003 (tokens do banco) — já existe UM ponto de resolução, nenhum componente abaixo escolhe cor.
  const tokens = resolveTokens({ marca: ALBORA_BRAND, pack: WEDDING.tokens ?? {} });

  return (
    <html lang="pt-BR">
      <body style={toVariables(tokens) as CSSProperties}>{children}</body>
    </html>
  );
}
