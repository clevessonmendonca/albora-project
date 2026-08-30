import type { ItemVisivel } from "../hooks/use-feed";

/**
 * Service para operações de feed.
 * Responsável por business logic que não depende de estado React.
 */

/**
 * Calcula a janela de URLs para pre-fetch baseada no índice atual do viewer.
 * 
 * @param itens - Lista de itens visíveis
 * @param indice - Índice atual sendo visualizado
 * @param window - Tamanho da janela (padrão: 3 antes e 3 depois)
 * @returns Array de chaves de mídia para pre-fetch
 */
export function calcularJanelaPrefetch(
  itens: ItemVisivel[],
  indice: number,
  window: number = 3,
): string[] {
  if (itens.length === 0) return [];

  const inicio = Math.max(0, indice - window);
  const fim = Math.min(itens.length, indice + window + 1);
  
  const chaves: string[] = [];
  
  for (let i = inicio; i < fim; i++) {
    const item = itens[i];
    if (!item) continue;
    
    const isVideo = item.mime.startsWith("video/");

    // chaveThumb serve de poster/fundo desfocado tanto pra foto quanto pra vídeo (Frame)
    if (item.chaveThumb) chaves.push(item.chaveThumb);

    // Vídeo precisa também do arquivo completo
    if (isVideo && item.chaveFull) {
      chaves.push(item.chaveFull);
    }
  }
  
  return chaves;
}

/**
 * Valida se um índice é válido para uma lista de itens.
 */
export function validarIndice(indice: number, total: number): boolean {
  return indice >= 0 && indice < total;
}

/**
 * Calcula o próximo índice com wrap around.
 */
export function proximoIndice(atual: number, total: number): number {
  return (atual + 1) % total;
}

/**
 * Calcula o índice anterior com wrap around.
 */
export function indiceAnterior(atual: number, total: number): number {
  return (atual - 1 + total) % total;
}

/**
 * Formata contagem de reações para exibição.
 */
export function formatarContagemReacoes(count: number): string {
  if (count === 0) return "";
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  return `${Math.floor(count / 1000)}k`;
}

/**
 * Determina se deve mostrar o indicador de "novos itens".
 */
export function deveNotificarNovosItens(
  primeiroIdAnterior: string | null,
  primeiroIdAtual: string | null,
  scrollY: number,
): boolean {
  if (primeiroIdAnterior === null || primeiroIdAtual === null) return false;
  if (primeiroIdAnterior === primeiroIdAtual) return false;
  
  // Só notifica se o usuário não está no topo
  return scrollY > 120;
}

/**
 * Calcula o tempo decorrido desde uma data para exibição relativa.
 */
export function calcularTempoRelativo(dataISO: string): string {
  const agora = Date.now();
  const data = new Date(dataISO).getTime();
  const diffMs = agora - data;
  
  const minutos = Math.floor(diffMs / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  
  if (minutos < 1) return "agora";
  if (minutos < 60) return `${minutos}m`;
  if (horas < 24) return `${horas}h`;
  if (dias < 7) return `${dias}d`;
  
  return new Date(data).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
  });
}
