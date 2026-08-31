/**
 * Formata timestamp em tempo relativo humano (pt-BR).
 * 
 * Exemplos:
 * - "agora" (< 1min)
 * - "há 5min" (< 1h)
 * - "há 2h" (< 24h)
 * - "28 ago" (≥ 24h)
 */
export function tempoRelativo(criadaEm: string | Date): string {
  const agora = new Date();
  const criada = criadaEm instanceof Date ? criadaEm : new Date(criadaEm);
  
  // Se data inválida, retorna vazio
  if (Number.isNaN(criada.getTime())) return "";
  
  const diffMs = agora.getTime() - criada.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  
  // Menos de 1 minuto
  if (diffMin < 1) return "agora";
  
  // Menos de 1 hora
  if (diffMin < 60) return `há ${diffMin}min`;
  
  // Menos de 24 horas
  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras}h`;
  
  // 24h ou mais: formato "28 ago"
  return criada.toLocaleDateString("pt-BR", { 
    day: "numeric", 
    month: "short" 
  });
}
