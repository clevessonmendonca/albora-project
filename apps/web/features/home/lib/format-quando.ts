/**
 * "23:05" no relógio local — mesma leitura de `formatarHora` em
 * `features/feed/components/client/comment-sheet.tsx`. Data inválida devolve
 * string vazia em vez de "Invalid Date": o card mostra a foto sem horário,
 * nunca um erro literal.
 */
export function formatQuando(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return "";
  return data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
