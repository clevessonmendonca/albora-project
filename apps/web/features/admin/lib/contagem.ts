import type { EventoDoHost } from "@albora/db";

const DIA = 86_400_000;

/**
 * Dias até o evento contando viradas de meia-noite — não frações de 24h. Uma
 * festa que começa hoje às 22h está a "hoje", não a "1 dia"; era essa diferença
 * que fazia a barra lateral e o herói discordarem na mesma tela.
 */
export function diasAte(comecaEm: Date): number {
  const hoje = new Date();
  const zeraHoje = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const zeraEvento = Date.UTC(comecaEm.getFullYear(), comecaEm.getMonth(), comecaEm.getDate());
  return Math.round((zeraEvento - zeraHoje) / DIA);
}

/** Rótulo curto da barra lateral. Mesma fonte de verdade da Home. */
export function rotuloContagem(evento: EventoDoHost): string {
  const agora = Date.now();
  if (evento.status === "ended" || agora > evento.terminaEm.getTime()) return "Evento encerrado";
  if (agora >= evento.comecaEm.getTime()) return "Acontecendo agora";

  const dias = diasAte(evento.comecaEm);
  if (dias > 1) return `Faltam ${dias} dias`;
  if (dias === 1) return "É amanhã";
  return "É hoje";
}
