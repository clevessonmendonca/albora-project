import { Accent, Heading } from "../pieces";
import { Reveal } from "../interactives";

export function ProvaSection() {
  return (
    <section className="bg-superficie">
      <div className="mx-auto max-w-[78rem] px-[clamp(1.125rem,4vw,2.75rem)] py-[clamp(3.5rem,7vw,5.25rem)]">
        <Reveal>
          <div className="grid items-start gap-[clamp(2rem,5vw,3.5rem)] md:grid-cols-2">
            <Heading size="clamp(2rem,4.5vw,3.5rem)">
              A festa acaba. <Accent>As fotos ficam espalhadas.</Accent>
            </Heading>
            <div>
              <p className="text-[1.05rem] leading-relaxed text-ink-2">
                Uma no celular da sua irmã. Outra no grupo, perdida entre
                mensagens. E aquela da pista que ninguém mandou?
              </p>
              <p className="mt-4 text-[1.05rem] leading-relaxed text-ink-2">
                Com o Albora, seus convidados têm um lugar para enviar tudo. O
                fotógrafo registra os grandes momentos. Eles mostram o que
                aconteceu ao redor.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
