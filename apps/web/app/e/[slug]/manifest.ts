import { ALBORA_BRAND, toVariables } from "@albora/tokens";
import type { MetadataRoute } from "next";

type Props = { params: Promise<{ slug: string }> };

/**
 * Manifest do evento: PWA instalado a partir do convidado abre a capa da festa,
 * não a landing de marketing.
 */
export default async function manifest({ params }: Props): Promise<MetadataRoute.Manifest> {
  const { slug } = await params;
  const chao = toVariables(ALBORA_BRAND)["--bg"]!;
  const start = `/e/${encodeURIComponent(slug)}/cover`;

  return {
    id: start,
    lang: "pt-BR",
    name: "Albora",
    short_name: "Albora",
    description: "O álbum coletivo desta festa.",
    start_url: start,
    scope: `/e/${encodeURIComponent(slug)}/`,
    display: "standalone",
    background_color: chao,
    theme_color: chao,
    icons: [
      { src: "/icone-app-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      {
        src: "/icone-app-invertido-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
