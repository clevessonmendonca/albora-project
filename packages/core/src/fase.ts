import type { Evento } from "./tipos";

export type StatusDoEvento = "draft" | "active" | "ended";

export type EventoComFase = Pick<Evento, "comecaEm" | "terminaEm"> & {
  status: StatusDoEvento;
};

export type FaseDoEvento = "rascunho" | "antes" | "durante" | "depois";

/** A listagem derivava fase de datas e o painel lia `status` do banco: dois vocabulários para o mesmo evento. Esta é a única fonte. */
export function faseDoEvento(evento: EventoComFase, agora: Date): FaseDoEvento {
  if (evento.status === "draft") return "rascunho";
  if (evento.status === "ended") return "depois";
  if (agora.getTime() < evento.comecaEm.getTime()) return "antes";
  if (agora.getTime() > evento.terminaEm.getTime()) return "depois";
  return "durante";
}
