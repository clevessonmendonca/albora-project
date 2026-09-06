import { resolvePackText, type Pack } from "@albora/packs";
import { Accent, Section } from "../pieces";

export function ProvaSection({ pack }: { pack: Pack }) {
  return (
    <Section
      reveal
      className="bg-superficie py-[clamp(3.5rem,7vw,5.25rem)] px-[clamp(1.125rem,4vw,2.75rem)]"
    >
      <div className="grid gap-[clamp(2rem,5vw,3.5rem)] lg:grid-cols-[1.35fr_1fr] items-center">
        <blockquote
          className="tipo-display m-0 font-light"
          style={{ fontSize: "clamp(1.5rem,3vw,2.375rem)", lineHeight: 1.24 }}
        >
          “No dia seguinte a gente acordou com{" "}
          <Accent>centenas de fotos</Accent> que nenhum fotógrafo tinha como
          pegar — as da festa inteira, pelos olhos de quem estava lá.”
          <cite className="mt-5 block text-sm not-italic text-ink-3">
            {resolvePackText(pack, "landing.exemplo.nome")} · São Paulo — depoimento ilustrativo
          </cite>
        </blockquote>
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5 text-[0.95rem] text-ink-2">
            <span className="font-bold text-acento-texto">✓</span>
            <span>Sem app e sem cadastro pro convidado — só apontar a câmera</span>
          </div>
          <div className="flex items-start gap-2.5 text-[0.95rem] text-ink-2">
            <span className="font-bold text-acento-texto">✓</span>
            <span>Fotos em resolução original, e o álbum é seu</span>
          </div>
          <div className="flex items-start gap-2.5 text-[0.95rem] text-ink-2">
            <span className="font-bold text-acento-texto">✓</span>
            <span>Localização e dados do aparelho apagados antes de subir</span>
          </div>
          <div className="flex items-start gap-2.5 text-[0.95rem] text-ink-2">
            <span className="font-bold text-acento-texto">✓</span>
            <span>Feito no Brasil</span>
          </div>
        </div>
      </div>
    </Section>
  );
}
