export type TermoId =
  | "moderacao"
  | "consentimento"
  | "telao"
  | "missoes"
  | "gate"
  | "modo-endurecido"
  | "retencao";

export type Termo = {
  id: TermoId;
  termo: string;
  frase: string;
};

export const GLOSSARIO: readonly Termo[] = [
  {
    id: "moderacao",
    termo: "Moderação",
    frase: "Você decide se as fotos aparecem na hora ou passam por uma fila de revisão antes.",
  },
  {
    id: "consentimento",
    termo: "Consentimento",
    frase:
      "Cada convidado concorda com o uso das fotos antes de enviar a primeira. A data e a versão do texto ficam registradas.",
  },
  {
    id: "telao",
    termo: "Telão",
    frase:
      "Uma tela no salão que mostra as fotos conforme elas chegam. Abre num link, sem instalar nada.",
  },
  {
    id: "missoes",
    termo: "Missões",
    frase:
      "Pedidos curtos de foto que aparecem para o convidado, do tipo uma com quem veio na sua mesa.",
  },
  {
    id: "gate",
    termo: "Gate de interação",
    frase:
      "A hora em que curtidas e comentários abrem. Antes disso o convidado só envia foto e vê a parede.",
  },
  {
    id: "modo-endurecido",
    termo: "Modo endurecido",
    frase: "Aperta as regras de envio quando a festa fica grande demais para revisar tudo.",
  },
  {
    id: "retencao",
    termo: "Retenção",
    frase:
      "Por quanto tempo as fotos ficam guardadas aqui. Antes do prazo acabar, elas vão para a nuvem de vocês.",
  },
];

const POR_ID = new Map(GLOSSARIO.map((t) => [t.id, t.frase]));

export function explicar(id: TermoId): string {
  return POR_ID.get(id) ?? "";
}
