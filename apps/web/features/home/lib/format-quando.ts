/** Hora local "23:05" — data inválida devolve string vazia (card mostra foto sem horário, nunca "Invalid Date"). */
export function formatQuando(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
