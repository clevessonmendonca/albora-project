/** Crachá próprio (não sessão de convidado) porque reutilizar a sessão autorizaria subir foto de uma TV sem dono. */
export type ConcessaoDaParede =
  | "ler.midia.publicada"
  | "ler.contagem"
  | "ler.identidade";

/** Lista fechada: nenhuma concessão de escrita — crachá copiado da TV não sobe nem reage. */
export const CONCESSOES_DA_PAREDE: readonly ConcessaoDaParede[] = [
  "ler.midia.publicada",
  "ler.contagem",
  "ler.identidade",
];

export type CrachaDaParede = {
  eventoId: string;
  /** Expira. Uma parede não fica válida para sempre porque a festa acabou. */
  expiraEm: Date;
  revogado: boolean;
};

export type Pedido = {
  eventoId: string;
  concessao: string;
};

export type VeredictoDaParede = {
  autorizado: boolean;
  codigo:
    | "parede.autorizada"
    | "parede.evento_divergente"
    | "parede.expirada"
    | "parede.revogada"
    | "parede.concessao_negada";
};

/** Evento divergente vem antes de tudo: crachá de uma festa pedindo mídia de outra é o vazamento irreversível. */
export function autorizarParede(
  cracha: CrachaDaParede,
  pedido: Pedido,
  agora: Date,
): VeredictoDaParede {
  if (cracha.eventoId !== pedido.eventoId) {
    return { autorizado: false, codigo: "parede.evento_divergente" };
  }

  if (cracha.revogado) return { autorizado: false, codigo: "parede.revogada" };

  if (agora.getTime() >= cracha.expiraEm.getTime()) {
    return { autorizado: false, codigo: "parede.expirada" };
  }

  if (!(CONCESSOES_DA_PAREDE as readonly string[]).includes(pedido.concessao)) {
    return { autorizado: false, codigo: "parede.concessao_negada" };
  }

  return { autorizado: true, codigo: "parede.autorizada" };
}

/** 12h cobrem a noite inteira e não deixam a tela virar link permanente depois que o salão fechou. */
export const VALIDADE_DA_PAREDE_HORAS = 12;

export function expiraEmPara(emitidoEm: Date): Date {
  return new Date(emitidoEm.getTime() + VALIDADE_DA_PAREDE_HORAS * 60 * 60 * 1000);
}
