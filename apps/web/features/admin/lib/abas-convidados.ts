export type AbaConvidadosId = "participacao" | "pessoas";

export type AbaConvidados = {
  id: AbaConvidadosId;
  rotulo: string;
  suffix: string;
};

export const ABAS_CONVIDADOS: readonly AbaConvidados[] = [
  { id: "participacao", rotulo: "Participação", suffix: "" },
  { id: "pessoas", rotulo: "Pessoas", suffix: "?aba=pessoas" },
];

export function abaConvidadosAtiva(valor: string | undefined): AbaConvidadosId {
  const encontrada = ABAS_CONVIDADOS.find((a) => a.id === valor);
  return encontrada ? encontrada.id : "participacao";
}
