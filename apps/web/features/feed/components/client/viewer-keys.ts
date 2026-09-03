import { isVideoMime } from "@albora/core";
import type { ItemVisivel } from "@/features/feed/hooks/use-feed";

/**
 * Chaves a assinar para a janela do visualizador em tela cheia — item atual
 * (full, e thumb quando foto) mais vizinhos próximos, para navegação sem
 * espera. Separado de viewer.tsx (que é code-split via next/dynamic) porque
 * feed-page.tsx precisa chamar isso fora do viewer, para pedir as URLs antes
 * dele montar — importar viewerKeys de lá traria o componente inteiro pro
 * bundle principal.
 *
 * Chave vazia fica de fora — item sem arquivo cheio não vira pedido de assinatura para string vazia.
 */
export function viewerKeys(itens: readonly ItemVisivel[], indice: number): string[] {
  const chaves: string[] = [];
  const atual = itens[indice];

  if (atual) {
    if (isVideoMime(atual.mime)) chaves.push(atual.chaveFull);
    else chaves.push(atual.chaveThumb, atual.chaveFull);
  }

  for (const passo of [1, 2]) {
    const proximo = itens[indice + passo];
    if (!proximo) continue;
    if (isVideoMime(proximo.mime)) chaves.push(proximo.chaveFull);
    else chaves.push(proximo.chaveThumb, proximo.chaveFull);
  }

  for (const passo of [-1, 3, 4]) {
    const vizinho = itens[indice + passo];
    if (!vizinho) continue;
    if (isVideoMime(vizinho.mime)) chaves.push(vizinho.chaveFull);
    else chaves.push(vizinho.chaveThumb);
  }

  return [...new Set(chaves.filter(Boolean))];
}