import { Section, Heading, Accent, Label } from "../pieces";

const STEPS = [
  {
    numero: "01",
    titulo: "O QR na mesa",
    descricao:
      "Cada mesa tem um código. O convidado aponta a câmera e já está dentro — nada pra instalar, nada pra logar.",
  },
  {
    numero: "02",
    titulo: "A foto, na hora",
    descricao:
      "Ele fotografa, a foto sobe. Aparece no telão e no feed enquanto a festa ainda acontece.",
  },
  {
    numero: "03",
    titulo: "O álbum, no dia seguinte",
    descricao:
      "Tudo organizado por momento. Seu, pra sempre — e vira livro impresso, se você quiser.",
  },
];

export function ComoFuncionaSection() {
  return (
    <Section id="como" reveal>
      <Label>Como funciona</Label>
      <Heading size="clamp(1.75rem,3.6vw,2.5rem)">
        Três toques até a primeira foto. <Accent>Zero instalação.</Accent>
      </Heading>
      <div className="mt-11 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-0">
        {STEPS.map((passo) => (
          <div
            key={passo.numero}
            className="md:border-l md:border-linha md:px-[clamp(1rem,2.5vw,2.125rem)] md:first:border-l-0 md:first:pl-0"
          >
            <div className="tipo-display text-[0.9375rem] text-acento-texto">
              {passo.numero}
            </div>
            <h3 className="tipo-display mt-3.5 mb-2.5 text-[1.3125rem] font-normal">
              {passo.titulo}
            </h3>
            <p className="m-0 max-w-[32ch] text-[0.96875rem] leading-relaxed text-ink-2">
              {passo.descricao}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}
