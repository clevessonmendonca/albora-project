import { ALBORA_BRAND, toVariables } from "@albora/tokens";
import type { MetadataRoute } from "next";

/** Manifest via resolvedor de tokens — hex fixo causaria piscar de cor errada na abertura (SO usa esse valor como chão). */
export default function manifest(): MetadataRoute.Manifest {
  const chao = toVariables(ALBORA_BRAND)["--bg"]!;

  return {
    id: "/",
    lang: "pt-BR",
    name: "Albora",
    short_name: "Albora",
    description: "O álbum coletivo da sua festa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: chao,
    theme_color: chao,
    icons: [
      { src: "/icone-app-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "any" },
      {
        // A margem de 96px em 512 põe o desenho dentro da zona segura da
        // máscara. Sem ela, o arco da marca sai cortado no Android.
        src: "/icone-app-invertido-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
