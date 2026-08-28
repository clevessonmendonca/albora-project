export type VeredictoDoClassificador = "limpo" | "suspeito" | "sem-resposta";

/** Silêncio é `sem-resposta`, nunca `limpo`: quem não rodou e quem falhou são iguais na parede. */
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

/** Só ofensivo segura o telão; `aparece_na_foto` só entra na fila — nunca some sozinho (flows.md §12). */
export function denunciaSeguraTelao(motivo: MotivoDeDenuncia): boolean {
  return motivo === "ofensivo";
}

export type EstadoDaMidia = {
  classificador: VeredictoDoClassificador;
  denuncias: number;
  /** "Sou eu nessa foto" — não seguram o telão, só entram na fila. Ausente = zero. */
  pedidosDeRemocao?: number;
  /** Remoção pelo anfitrião ou por quem enviou. Irreversível na exibição. */
  removida: boolean;
  /** Anfitrião olhou e liberou — cobre falso positivo e denúncia indevida. */
  liberadaPeloAnfitriao: boolean;
};

export type EstadoDoEvento = {
  /** Pausa tudo, das duas superfícies. Está no admin **e** na tela do telão. */
  panico: boolean;
  /** Ligável no meio da festa: passa a exigir aprovação antes de exibir. */
  modoEndurecido: boolean;
};

/** Duas, não uma: uma só entrega a parede a qualquer desafeto. */
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

/** Sem resposta do classificador: publica na galeria (ativa), segura do telão (passivo — 150 pessoas sem escolha). */
export function decidirExibicao(
  midia: EstadoDaMidia,
  evento: EstadoDoEvento,
  superficie: Superficie,
  /** Cai para 1 com menores na festa (ADR 0012); quem calcula é `menores.ts`. */
  denunciasParaSegurar: number = DENUNCIAS_PARA_SEGURAR,
): Decisao {
  // Precedência: remoção e pânico são humanos agindo agora — nenhuma decisão automática passa por cima.
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

/** Recebe id opaco, nunca nome/contato: PII escapa facilmente em auditoria. Quem chama já mascara. */
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

/** O limiar deve ser o MESMO de `decidirExibicao`; divergência escondia a foto sem recurso para o anfitrião. */
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

/** Por que está na fila; null se `precisaDeRevisao` é falso. */
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
