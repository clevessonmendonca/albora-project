import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Albora — spike de plataforma",
  description: "Verificação da task 001. Descartável.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#16110D",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        {/* Clássico e síncrono de propósito: o SW importa o mesmo arquivo
            via importScripts, e uma fila só tem valor se for a mesma dos dois lados. */}
        <script src="/fila-idb.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
