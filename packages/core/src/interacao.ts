import type { Evento } from "./tipos";

/**
 * O mínimo que decide o gate. Um `Evento` inteiro é assinável aqui, mas o
 * servidor lê uma coluna só — e pedir o objeto completo obrigaria a rota do
 * feed a montar um evento que ela não usa para nada.
 */
export type GateDeInteracao = Pick<Evento, "interacaoAbreEm">;

/**
 * O gate de interação do ADR 0009. Quem decide quando abrir são os anfitriões.
 *
 * Mora aqui, e não num componente, porque as duas superfícies precisam da
 * mesma resposta. Gate reimplementado no app é gate que abre em horário
 * diferente do da web — e aí a festa tem duas regras.
 *
 * Desde a atualização do ADR 0009, este gate governa **comentário** e a
 * identidade do autor (perfil clicável, compartilhar, bloquear) — não mais a
 * reação, que é liberada assim que a mídia publica (ver `podeReagir` em
 * `./galeria`).
 */
export function interacaoAberta(evento: GateDeInteracao, agora: Date): boolean {
  if (evento.interacaoAbreEm === null) return false;
  return agora.getTime() >= evento.interacaoAbreEm.getTime();
}

/**
 * O que a superfície pode mostrar neste instante.
 *
 * Antes do gate o feed existe, espelha o que já está no telão, e a reação já
 * responde — só o comentário e a identidade do autor esperam (ADR 0009).
 */
export type ModoInteracao = "espelho" | "completo";

export function modoInteracao(evento: GateDeInteracao, agora: Date): ModoInteracao {
  return interacaoAberta(evento, agora) ? "completo" : "espelho";
}
