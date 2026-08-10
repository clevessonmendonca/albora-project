import type { Evento } from "./tipos";

/**
 * O gate de interação do ADR 0009. Quem decide quando abrir são os noivos.
 *
 * Mora aqui, e não num componente, porque as duas superfícies precisam da
 * mesma resposta. Gate reimplementado no app é gate que abre em horário
 * diferente do da web — e aí a festa tem duas regras.
 */
export function interacaoAberta(evento: Evento, agora: Date): boolean {
  if (evento.interacaoAbreEm === null) return false;
  return agora.getTime() >= evento.interacaoAbreEm.getTime();
}

/**
 * O que a superfície pode mostrar neste instante.
 *
 * Antes do gate o feed existe, mas só espelha o que já está no telão, sem
 * contagem — ver, sem laço de checagem.
 */
export type ModoInteracao = "espelho" | "completo";

export function modoInteracao(evento: Evento, agora: Date): ModoInteracao {
  return interacaoAberta(evento, agora) ? "completo" : "espelho";
}
