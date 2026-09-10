import { resolvePackText, type Pack } from "@albora/packs";
import { ALBORA_BRAND, resolveTokens, toVariables } from "@albora/tokens";
import type { CSSProperties } from "react";
import { Reveal } from "../interactives";
import { QrAoVivo } from "../qr-ao-vivo";
import { DemoInterativa, type FotoDemo } from "../demo-interativa";

/** Fotos de exemplo do álbum — assets reais já otimizados no repo. */
const FOTOS: readonly FotoDemo[] = [
  { src: "/landing/gen/09-amigos-na-mesa.png", alt: "Convidados reunidos na mesa" },
  { src: "/landing/gen/06-casal-revendo-album.png", alt: "O casal revendo o álbum" },
  { src: "/landing/gen/07-pista-de-danca.png", alt: "Convidados na pista de dança" },
];

const FOTO_EXEMPLO: FotoDemo = {
  src: "/landing/gen/02-perspectivas.png",
  alt: "Foto de exemplo enviada por um convidado",
};

/**
 * Seção demo — parte estática (RSC) + prévia interativa (client). Fundo
 * full-bleed papel-2 como no protótipo; o texto de domínio (placeholder e
 * subtítulo do álbum) sai do pack, a copy de produto vive no client.
 */
export function DemoSection({ pack }: { pack: Pack }) {
  const t = (chave: string) => resolvePackText(pack, chave);

  // Recorte escuro de tokens para o modo "No telão" do álbum.
  const telaoVars = toVariables(
    resolveTokens({ marca: ALBORA_BRAND, pack: { ...pack.tokens, background: "dark" } }),
  ) as CSSProperties;

  return (
    <section id="demo" className="bg-superficie">
      <div className="mx-auto max-w-[78rem] px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(4rem,8vw,6.5rem)]">
        <Reveal>
          <DemoInterativa
            nomeExemplo={t("landing.exemplo.nome")}
            albumSub={t("landing.demo.album.sub")}
            placeholder={t("landing.demo.placeholder")}
            fotos={FOTOS}
            fotoExemplo={FOTO_EXEMPLO}
            telaoVars={telaoVars}
            qr={<QrAoVivo packHint={pack.id} />}
          />
        </Reveal>
      </div>
    </section>
  );
}
