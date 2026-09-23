export type AbaFotosId = "todas" | "revisar" | "destaques";

export type AbaFotos = {
  id: AbaFotosId;
  rotulo: string;
  suffix: string;
};

export const ABAS_FOTOS: readonly AbaFotos[] = [
  { id: "todas", rotulo: "Todas", suffix: "" },
  { id: "revisar", rotulo: "Revisar", suffix: "?aba=revisar" },
  { id: "destaques", rotulo: "Destaques", suffix: "?aba=destaques" },
];

export function abaAtiva(valor: string | undefined): AbaFotosId {
  const encontrada = ABAS_FOTOS.find((a) => a.id === valor);
  return encontrada ? encontrada.id : "todas";
}
