import { Section, Accent, Heading, Label } from "../pieces";

const OBJ: ReadonlyArray<{ q: string; a: string }> = [
  {
    q: "Meus convidados mais velhos vão conseguir?",
    a: "Sim. Apontam a câmera pro QR da mesa e caem direto na tela de fotografar — sem app, sem cadastro, sem senha. Funciona igual pra quem tem 15 e pra quem tem 80.",
  },
  {
    q: "E a privacidade das fotos? (LGPD)",
    a: "Só quem escaneia o seu QR vê o evento. Localização e dados do aparelho são apagados no celular, antes de subir. Nada aparece em busca ou página pública, e a sessão do convidado vale só pra um evento.",
  },
  {
    q: "E se a internet do salão for ruim?",
    a: "O envio precisa de conexão. Combine o acesso ao Wi-Fi do local e oriente os convidados a guardar as fotos no celular para enviar quando houver sinal.",
  },
  {
    q: "E uma foto inadequada no telão?",
    a: "Um classificador segura o impróprio automaticamente, qualquer convidado pode denunciar, e você tira do telão num toque. Dá pra ligar aprovação manual se preferir.",
  },
  {
    q: "As fotos ficam com vocês?",
    a: "São suas. Você pode baixar o álbum em ZIP antes do fim do prazo do plano e guardar uma cópia onde preferir.",
  },
];

export function ObjecoesSection() {
  return (
    <Section reveal>
      <Label>A objeção de todo mundo</Label>
      <Heading
        size="clamp(1.875rem,4.4vw,3.25rem)"
        className="mt-3.5 max-w-[16ch]"
      >
        Seus convidados <Accent>não baixam nada.</Accent>
      </Heading>
      <div className="mt-8 border-t border-linha">
        {OBJ.map((item, i) => (
          <details key={item.q} className="border-b border-linha" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-[1.125rem] font-medium [&::-webkit-details-marker]:hidden">
              {item.q}
              <span className="text-xl leading-none text-acento-texto">+</span>
            </summary>
            <p className="m-0 mb-[1.125rem] max-w-[64ch] text-ink-2">{item.a}</p>
          </details>
        ))}
      </div>
    </Section>
  );
}
