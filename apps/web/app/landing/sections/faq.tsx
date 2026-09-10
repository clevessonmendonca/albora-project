import { Section, Heading, Accent } from "../pieces";

const FAQ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "O convidado precisa baixar um app?",
    a: "Não. Ele abre o link do evento pelo QR Code e participa pelo navegador do celular.",
  },
  {
    q: "Preciso ter um telão?",
    a: "Não. O álbum funciona nos celulares. O telão é uma opção do plano Completo para quem tem TV ou projetor no local.",
  },
  {
    q: "E se a internet estiver ruim?",
    a: "O envio precisa de conexão. Combine o acesso ao Wi-Fi do local e oriente os convidados a guardar as fotos no celular para enviar quando houver sinal.",
  },
  {
    q: "Quem pode ver as fotos?",
    a: "O acesso é feito pelo link ou QR do evento. Compartilhe com seus convidados e lembre que eles podem repassar esse acesso.",
  },
  {
    q: "O que acontece quando o espaço acaba?",
    a: "Na oferta proposta, novos envios param ao atingir a capacidade. As fotos já recebidas continuam disponíveis para ver e baixar até o fim do prazo. No Grátis, você pode escolher o Completo para ter mais espaço.",
  },
  {
    q: "Isso substitui o fotógrafo?",
    a: "Não. O Albora reúne os registros dos convidados e complementa as fotos profissionais com outros pontos de vista.",
  },
  {
    q: "O álbum fica disponível para sempre?",
    a: "Não. O Grátis inclui 30 dias de galeria e o Completo, 6 meses. Os dois permitem baixar tudo em ZIP para guardar uma cópia antes do prazo terminar.",
  },
];

export function FaqSection() {
  return (
    <Section id="faq" reveal>
      <div className="grid gap-[clamp(1.5rem,4vw,3rem)] md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Heading size="clamp(1.5rem,3vw,2.25rem)">
            Antes de convidar <Accent>todo mundo.</Accent>
          </Heading>
          <p className="mt-4 text-ink-2">
            O que vale saber para planejar sua festa.
          </p>
        </div>
        <div className="border-t border-linha">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="border-b border-linha">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[1.125rem] font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-xl leading-none text-acento-texto">+</span>
              </summary>
              <p className="m-0 mb-[1.125rem] max-w-[64ch] text-ink-2">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
