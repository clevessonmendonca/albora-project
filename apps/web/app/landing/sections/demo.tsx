import { resolvePackText, type Pack } from "@albora/packs";
import { Reveal } from "../interactives";
import { DemoInterativa, type FotoDemo } from "../demo-interativa";
import { HREF_CRIAR_GRATIS } from "../landing-data";

/** Fotos de exemplo do álbum — assets reais já otimizados no repo. */
const FOTOS: readonly FotoDemo[] = [
  { src: "/landing/gen/09-amigos-na-mesa.png", alt: "Convidados reunidos na mesa" },
  { src: "/landing/gen/06-casal-revendo-album.png", alt: "O casal revendo o álbum" },
  { src: "/landing/gen/07-pista-de-danca.png", alt: "Convidados na pista de dança" },
  { src: "/landing/gen/02-perspectivas.png", alt: "Um brinde entre amigos" },
];

/**
 * "Do celular deles, para o seu álbum" — a prévia do álbum com o nome ao vivo.
 * Fundo full-bleed papel-2 como no protótipo; o texto de domínio (placeholder e
 * subtítulo do álbum) sai do pack.
 */
export function DemoSection({ pack }: { pack: Pack }) {
  const t = (chave: string) => resolvePackText(pack, chave);

  return (
    <section id="demo" className="bg-superficie">
      <div className="mx-auto max-w-[78rem] px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(4rem,8vw,6.5rem)]">
        <Reveal>
          <DemoInterativa
            nomeExemplo={t("landing.exemplo.nome")}
            albumSub={t("landing.demo.album.sub")}
            placeholder={t("landing.demo.placeholder")}
            fotos={FOTOS}
            hrefBase={HREF_CRIAR_GRATIS}
            packId={pack.id}
          />
        </Reveal>
      </div>
    </section>
  );
}
