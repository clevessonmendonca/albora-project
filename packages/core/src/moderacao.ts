/**
 * Quem aparece, onde, e por quê (spec 011).
 *
 * A premissa da spec é que **ninguém está olhando fila** — os noivos estão na
 * festa. Então a decisão não pode depender de alguém acordado: ela é uma
 * função do estado, avaliada toda vez que uma superfície vai desenhar.
 *
 * Devolve sempre um código estável junto com o veredito. A verificação 7 é
 * *"toda ação registrada com a decisão, não só as negadas"* — auditoria que só
 * grava negativa não reconstrói o que aconteceu, e é na liberação que mora a
 * pergunta cara depois da festa.
 */

export type VeredictoDoClassificador = "limpo" | "suspeito" | "sem-resposta";

/**
 * Silêncio (NULL, vazio, valor desconhecido) é `sem-resposta`, nunca `limpo`.
 *
 * Quem ainda não rodou e quem falhou são a mesma coisa na parede: o telão
 * segura. O feed/galeria não filtram por veredicto — falham abertos.
 */
export function interpretarVeredicto(bruto: string | null | undefined): VeredictoDoClassificador {
  if (bruto === "limpo" || bruto === "suspeito" || bruto === "sem-resposta") return bruto;
  return "sem-resposta";
}

export type Superficie = "galeria" | "telao";

export type MotivoDeDenuncia = "ofensivo" | "aparece_na_foto";

export const MOTIVOS_DE_DENUNCIA = ["ofensivo", "aparece_na_foto"] as const;

export const MOTIVO_DENUNCIA_PADRAO: MotivoDeDenuncia = "ofensivo";

export function ehMotivoDeDenuncia(valor: unknown): valor is MotivoDeDenuncia {
  return valor === "ofensivo" || valor === "aparece_na_foto";
}

/**
 * Só conteúdo ofensivo segura o telão. Pedido de quem aparece na foto
 * (`aparece_na_foto`) entra na fila; o anfitrião decide — nunca some sozinho
 * (flows.md §12 buraco 2).
 */
export function denunciaSeguraTelao(motivo: MotivoDeDenuncia): boolean {
  return motivo === "ofensivo";
}

export type EstadoDaMidia = {
  classificador: VeredictoDoClassificador;
  denuncias: number;
  /**
   * Pedidos "sou eu nessa foto". Não entram em `denuncias` e não seguram o
   * telão — só a fila de revisão. Ausente = zero.
   */
  pedidosDeRemocao?: number;
  /** Remoção pelo anfitrião ou por quem enviou. Irreversível na exibição. */
  removida: boolean;
  /**
   * O anfitrião olhou e liberou. Cobre falso positivo do classificador e
   * denúncia indevida — que é o risco que a spec registra como mais provável.
   */
  liberadaPeloAnfitriao: boolean;
};

export type EstadoDoEvento = {
  /** Pausa tudo, das duas superfícies. Está no admin **e** na tela do telão. */
  panico: boolean;
  /** Ligável no meio da festa: passa a exigir aprovação antes de exibir. */
  modoEndurecido: boolean;
};

/**
 * Duas denúncias tiram do telão sozinhas.
 *
 * As 150 pessoas na sala veem a parede antes de qualquer classificador. São o
 * melhor sensor disponível e são de graça. Duas, e não uma, porque uma só
 * entrega a parede para qualquer desafeto.
 */
export const DENUNCIAS_PARA_SEGURAR = 2;

export type CodigoDeModeracao =
  | "moderacao.removida"
  | "moderacao.panico"
  | "moderacao.denuncias"
  | "moderacao.aguarda_aprovacao"
  | "moderacao.classificador_suspeito"
  | "moderacao.classificador_sem_resposta"
  | "moderacao.liberada_pelo_anfitriao"
  | "moderacao.publicada";

export type Decisao = {
  visivel: boolean;
  codigo: CodigoDeModeracao;
};

/**
 * A assimetria que decide o produto.
 *
 * Quando o classificador não responde a tempo: **publica na galeria, segura do
 * telão.** Galeria é ativa — alguém escolheu abrir. Telão é passivo — 150
 * pessoas estão olhando sem ter escolhido. Falhar aberto na galeria custa
 * pouco; falhar aberto na parede custa a festa.
 */
export function decidirExibicao(
  midia: EstadoDaMidia,
  evento: EstadoDoEvento,
  superficie: Superficie,
  /**
   * Quantas denúncias seguram. Cai para 1 quando o anfitrião marca que há
   * menores na festa (ADR 0012) — quem calcula é `menores.ts`, e o padrão
   * aqui mantém quem já chamava com três argumentos.
   */
  denunciasParaSegurar: number = DENUNCIAS_PARA_SEGURAR,
): Decisao {
  // A ordem abaixo é precedência, não estilo. Remoção e pânico vêm antes de
  // qualquer liberação: são as duas coisas que um humano acabou de mandar
  // fazer, e nenhuma decisão automática pode passar por cima delas.
  if (midia.removida) return { visivel: false, codigo: "moderacao.removida" };
  if (evento.panico) return { visivel: false, codigo: "moderacao.panico" };

  if (midia.liberadaPeloAnfitriao) {
    return { visivel: true, codigo: "moderacao.liberada_pelo_anfitriao" };
  }

  if (superficie === "telao" && midia.denuncias >= denunciasParaSegurar) {
    return { visivel: false, codigo: "moderacao.denuncias" };
  }

  if (evento.modoEndurecido) {
    return { visivel: false, codigo: "moderacao.aguarda_aprovacao" };
  }

  if (midia.classificador === "suspeito") {
    return { visivel: false, codigo: "moderacao.classificador_suspeito" };
  }

  if (midia.classificador === "sem-resposta" && superficie === "telao") {
    return { visivel: false, codigo: "moderacao.classificador_sem_resposta" };
  }

  return { visivel: true, codigo: "moderacao.publicada" };
}

export type EntradaDeAuditoria = {
  eventoId: string;
  midiaId: string;
  superficie: Superficie;
  /** Quem provocou. Nunca o nome do convidado — id opaco, sempre. */
  ator: string;
  visivel: boolean;
  codigo: CodigoDeModeracao;
  em: string;
};

/**
 * A linha de auditoria de uma decisão.
 *
 * Recebe id opaco e nunca nome, telefone ou e-mail: log com PII crua é
 * violação, e auditoria é o lugar onde ela mais escapa porque "é interno".
 * Quem chama passa `ator` já mascarado — esta função não tem como saber se
 * recebeu um id ou um nome, e por isso o tipo não aceita a sessão inteira.
 */
export function registrarDecisao(
  entrada: Omit<EntradaDeAuditoria, "visivel" | "codigo" | "em">,
  decisao: Decisao,
  em: Date,
): EntradaDeAuditoria {
  return {
    ...entrada,
    visivel: decisao.visivel,
    codigo: decisao.codigo,
    em: em.toISOString(),
  };
}

/**
 * O que o anfitrião precisa olhar, e nada além.
 *
 * 🔴 O limiar tem de ser o **mesmo** que `decidirExibicao` usou para segurar.
 * Sem o parâmetro, com menores na festa (ADR 0012) o telão segurava a foto com
 * 1 denúncia e a fila de revisão — presa em 2 — nunca a mostrava: escondida sem
 * recurso, que é o pior estado possível para o anfitrião resolver.
 */
export function precisaDeRevisao(
  midia: EstadoDaMidia,
  evento: EstadoDoEvento,
  denunciasParaSegurar: number = DENUNCIAS_PARA_SEGURAR,
): boolean {
  if (midia.removida || midia.liberadaPeloAnfitriao) return false;

  return (
    (midia.pedidosDeRemocao ?? 0) >= 1 ||
    midia.denuncias >= denunciasParaSegurar ||
    midia.classificador === "suspeito" ||
    midia.classificador === "sem-resposta" ||
    evento.modoEndurecido
  );
}

export type MotivoDaFila = "denuncias" | "classificador" | "endurecido" | "aparece_na_foto";

/**
 * Por que a foto está na fila. Precedência: endurecido, classificador, pedido
 * de quem aparece, denúncia ofensiva. `null` se `precisaDeRevisao` é falso.
 */
export function motivoDaFila(
  midia: EstadoDaMidia,
  evento: EstadoDoEvento,
  denunciasParaSegurar: number = DENUNCIAS_PARA_SEGURAR,
): MotivoDaFila | null {
  if (!precisaDeRevisao(midia, evento, denunciasParaSegurar)) return null;
  if (evento.modoEndurecido) return "endurecido";
  if (midia.classificador === "suspeito" || midia.classificador === "sem-resposta") {
    return "classificador";
  }
  if ((midia.pedidosDeRemocao ?? 0) >= 1) return "aparece_na_foto";
  return "denuncias";
}
