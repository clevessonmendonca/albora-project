export function tempoRelativo(criadaEm: string | Date): string {
  const agora = new Date();
  const criada = criadaEm instanceof Date ? criadaEm : new Date(criadaEm);

  if (Number.isNaN(criada.getTime())) return "";

  const diffMs = agora.getTime() - criada.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "agora";

  if (diffMin < 60) return `há ${diffMin}min`;

  const diffHoras = Math.floor(diffMin / 60);
  if (diffHoras < 24) return `há ${diffHoras}h`;

  return criada.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short"
  });
}
