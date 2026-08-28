import type { VeredictoDoClassificador } from "./moderacao";

const PADROES_SUSPEITOS = [
  /\b(puta|caralho|merda|fod[a-se]|viado|bicha)\b/i,
  /\b(kill|die|rape)\b/i,
];

export function classificarTexto(texto: string): VeredictoDoClassificador {
  const normalizado = texto.normalize("NFKC");
  for (const padrao of PADROES_SUSPEITOS) {
    if (padrao.test(normalizado)) return "suspeito";
  }
  return "limpo";
}
