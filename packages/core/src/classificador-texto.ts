import type { VeredictoDoClassificador } from "./moderacao";

/**
 * Classificação heurística de texto, fora do caminho crítico (spec 014).
 *
 * Publicar nunca espera isto. Quando falha ou demora, o comentário já está no
 * ar com veredicto nulo — tratado como limpo na leitura. A mídia é o contrário
 * na parede: nulo vira `sem-resposta` e o telão segura.
 */
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
