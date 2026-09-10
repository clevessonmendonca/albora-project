import { Accent, Heading, Section } from "../pieces";

export function ProvaSection() {
  return (
    <Section
      reveal
      className="bg-superficie py-[clamp(3.5rem,7vw,5.25rem)] px-[clamp(1.125rem,4vw,2.75rem)]"
    >
      <div className="grid gap-[clamp(2rem,5vw,3.5rem)] lg:grid-cols-[1.1fr_1fr] items-start">
        <div>
          <Heading size="clamp(2rem,4.5vw,3.5rem)">
            A festa acaba. <Accent>As fotos ficam espalhadas.</Accent>
          </Heading>
          <p className="mt-6 max-w-[42ch] text-[1.05rem] leading-relaxed text-ink-2">
            Uma no celular da sua irmã. Outra no grupo, perdida entre mensagens.
            E aquela da pista que ninguém mandou?
          </p>
          <p className="mt-4 max-w-[42ch] text-[1.05rem] leading-relaxed text-ink-2">
            Com o Albora, seus convidados têm um lugar para enviar tudo. O fotógrafo
            registra os grandes momentos. Eles mostram o que aconteceu ao redor.
          </p>
        </div>
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
