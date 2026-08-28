import type { Evento } from "./tipos";

export type GateDeInteracao = Pick<Evento, "interacaoAbreEm">;

/** Gate aqui, não no componente: reimplementar na app daria horários diferentes nas duas superfícies. */
export function interacaoAberta(evento: GateDeInteracao, agora: Date): boolean {
  if (evento.interacaoAbreEm === null) return false;
  return agora.getTime() >= evento.interacaoAbreEm.getTime();
}

export type ModoInteracao = "espelho" | "completo";

export function modoInteracao(evento: GateDeInteracao, agora: Date): ModoInteracao {
  return interacaoAberta(evento, agora) ? "completo" : "espelho";
}
