import { eventEntryUrl } from "@albora/core";
import { origemPublica, qrSvg } from "@/lib/utils/qr-svg";
import { LandingCtaLink } from "./landing-cta-link";
import { HREF_DEMO } from "./landing-data";
import { lightPillClasses } from "./pieces";

const SLUG_DEMO = "festa-demo";

/**
 * O QR real da demo, escaneável da tela do computador.
 *
 * A categoria inteira promete "sem app, sem cadastro" e quebra a promessa na
 * prática — reviews registram participações de 2 em 120 e 7 em 110, sempre pela
 * mesma cadeia: QR que leva a uma loja, parede de cadastro, anfitrião que testou
 * só no próprio celular. Prometer de novo não convence ninguém; deixar a pessoa
 * conferir com o próprio aparelho, sim.
 *
 * Sem `APP_ROOT_DOMAIN` o QR não é renderizado: um código apontando para o lugar
 * errado desmentiria exatamente o que ele existe para provar.
 */
export function QrAoVivo({ packHint }: { packHint: string }) {
  const origem = origemPublica();
  const alvo = origem ? eventEntryUrl(origem, SLUG_DEMO, "qr") : null;
  const codigo = alvo ? qrSvg(alvo) : null;

  return (
    <div className="mt-[clamp(1.75rem,3.5vw,2.75rem)] flex flex-wrap items-center gap-[clamp(1.25rem,3vw,2.25rem)]">
      {codigo && (
        <div className="shrink-0 rounded-superficie bg-superficie-alta p-4">
          <svg
            viewBox={`0 0 ${codigo.lado} ${codigo.lado}`}
            shapeRendering="crispEdges"
            role="img"
            aria-label="QR da festa de demonstração"
            className="block size-[clamp(6.5rem,18vw,8.25rem)] text-ink"
          >
            <path d={codigo.path} fill="currentColor" />
          </svg>
        </div>
      )}

      <div className="min-w-[min(100%,17rem)] flex-1">
        <p className="m-0 mb-2 font-titulo text-[clamp(1.0625rem,1.8vw,1.25rem)] leading-snug text-ink">
          Confira você mesmo, agora.
        </p>
        <p className="m-0 mb-4 max-w-[42ch] text-[0.9375rem] leading-normal text-ink-2">
          {codigo ? "Aponte o celular para o código, ou toque no botão. " : ""}
          Vai abrir a festa de demonstração no navegador, sem instalar nada e sem
          criar conta. É o mesmo caminho que os seus convidados vão fazer.
        </p>
        <LandingCtaLink
          href={HREF_DEMO}
          packHint={packHint}
          className={`${lightPillClasses} bg-acento-superficie-suave py-3 text-[0.90625rem]`}
        >
          Abrir a demonstração
        </LandingCtaLink>
      </div>
    </div>
  );
}
