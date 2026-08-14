import { ALBORA_BRAND, toVariables } from "@albora/tokens";
import type { MetadataRoute } from "next";

/**
 * O manifest sai do resolvedor, não de um JSON com hex escrito à mão.
 *
 * A cor daqui é a que o sistema operacional pinta atrás do app enquanto ele
 * abre. Um hex fixo aqui descolaria do chão que o produto de fato pinta, e o
 * sintoma é um piscar de cor errada em toda abertura — a primeira coisa que o
 * convidado vê.
 */
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
