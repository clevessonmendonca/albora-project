import type { FaseDoEvento } from "@albora/core";

export type PassoId = "missoes" | "capa" | "identidade" | "convidados" | "gate";

export type Passo = {
  id: PassoId;
  rotulo: string;
  porque: string;
  href: string;
};

export type SinaisDoEvento = {
  fase: FaseDoEvento;
  temCapa: boolean;
  temIdentidade: boolean;
  missoes: number;
  convidadosEsperados: number;
  gateDefinido: boolean;
};

const MAXIMO = 3;

/** Ordem por impacto na participação, que é a hipótese que decide o produto. O gate fica por último: é o único com padrão sensato sem o casal tocar. */
const ORDEM: readonly {
  id: PassoId;
  rotulo: string;
  porque: string;
  suffix: string;
  pendente: (s: SinaisDoEvento) => boolean;
}[] = [
  {
    id: "missoes",
    rotulo: "Escolher as missões",
    porque: "É o que faz o convidado tirar a segunda foto, não só a primeira.",
    suffix: "/missions",
    pendente: (s) => s.missoes === 0,
  },
  {
    id: "capa",
    rotulo: "Escolher a capa",
    porque: "É a primeira coisa que o convidado vê ao escanear.",
    suffix: "/identity",
    pendente: (s) => !s.temCapa,
  },
  {
    id: "identidade",
    rotulo: "Definir a cor do evento",
    porque: "Deixa as fotos com a cara da festa, no telão e no álbum.",
    suffix: "/identity",
    pendente: (s) => !s.temIdentidade,
  },
  {
    id: "convidados",
    rotulo: "Informar quantos convidados",
    porque: "Sem isso não dá para saber se a participação está boa.",
    suffix: "/guests",
    pendente: (s) => s.convidadosEsperados === 0,
  },
  {
    id: "gate",
    rotulo: "Decidir quando abrir a interação",
    porque: "O padrão é abrir depois da cerimônia. Você escolhe a hora.",
    suffix: "/consent",
    pendente: (s) => !s.gateDefinido,
  },
];

export function proximosPassos(sinais: SinaisDoEvento, base: string): Passo[] {
  if (sinais.fase !== "rascunho" && sinais.fase !== "antes") return [];

  return ORDEM.filter((p) => p.pendente(sinais))
    .slice(0, MAXIMO)
    .map(({ id, rotulo, porque, suffix }) => ({
      id,
      rotulo,
      porque,
      href: `${base}${suffix}`,
    }));
}
