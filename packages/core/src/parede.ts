/**
 * O crachá da parede (spec 010).
 *
 * A rota do feed exige sessão de convidado e devolve 401 sem ela. O telão não
 * é convidado: é uma tela pendurada no salão, sem ninguém operando. Reusar a
 * sessão do convidado resolveria a leitura e **autorizaria subir foto de uma
 * TV que fica ligada sozinha num salão** — a credencial mais fácil de furtar
 * do produto inteiro, porque está literalmente na parede.
 *
 * Daí um crachá próprio, com a forma do [ADR 0004](../../../docs/adr/0004-anonymous-guest-session.md)
 * — opaco, assinado, preso a UM evento — e com as concessões invertidas: lê
 * tudo que já está publicado, não escreve nada.
 */

export type ConcessaoDaParede =
  | "ler.midia.publicada"
  | "ler.contagem"
  | "ler.identidade";

/**
 * O que a parede pode fazer. Lista fechada, e curta de propósito.
 *
 * Nenhuma concessão de escrita aparece aqui, e é isto que faz o crachá ser
 * seguro de deixar numa TV: mesmo copiado, ele não sobe, não reage, não
 * comenta e não remove.
 */
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

/**
 * Autoriza ou recusa, sempre com código estável para auditoria.
 *
 * A ordem é precedência: evento divergente vem antes de tudo porque é a
 * tentativa que interessa registrar — crachá de uma festa pedindo mídia de
 * outra é o vazamento entre eventos que o `CLAUDE.md` chama de irreversível.
 */
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

/**
 * Quanto tempo o crachá vale a partir da emissão.
 *
 * A festa acaba de madrugada e a TV às vezes fica ligada até o salão fechar.
 * Doze horas cobrem a noite inteira com folga e não deixam a tela virar um
 * link permanente para o acervo depois que todo mundo foi embora.
 */
export const VALIDADE_DA_PAREDE_HORAS = 12;

export function expiraEmPara(emitidoEm: Date): Date {
  return new Date(emitidoEm.getTime() + VALIDADE_DA_PAREDE_HORAS * 60 * 60 * 1000);
}
