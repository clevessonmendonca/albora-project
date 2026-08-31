import { shouldGiveUp, retryWaitSeconds, type Queue, type QueueItem } from "./fila";
import type { RespostaPresign } from "./upload";

export type Transport = {
  presign(item: QueueItem): Promise<RespostaPresign>;
  sendBytes(url: string, item: QueueItem): Promise<void>;
  /** Miniatura JPEG em `/thumb` (foto ou frame de vídeo). Opcional — só a web hoje. */
  sendPoster?(url: string, poster: Blob): Promise<void>;
  confirm(item: QueueItem, presign: RespostaPresign): Promise<void>;
};

export type SendResult =
  | { estado: "enviado"; id: string }
  | { estado: "retentar"; id: string; esperaSegundos: number; motivo: string }
  | { estado: "desistiu"; id: string; motivo: string };

/** Nunca lança: erro é valor para o laço continuar e não derrubar os itens seguintes. */
export async function sendItem(
  item: QueueItem,
  transport: Transport,
  queue: Queue,
): Promise<SendResult> {
  if (shouldGiveUp(item)) {
    // Desistir **não** apaga o item — ele vira falha visível na galeria, com "tentar de novo"; apagar em silêncio é a foto sumindo sem explicação, o pior modo de falha deste produto.
    return { estado: "desistiu", id: item.id, motivo: "tentativas esgotadas" };
  }

  try {
    const presign = await transport.presign(item);

    // A ordem importa: os bytes vão para o storage **antes** do confirm — um confirm que chega primeiro cria linha apontando para objeto que não existe, foto na galeria que não abre.
    await transport.sendBytes(presign.full, item);

    const thumbnail = item.thumb ?? item.poster;
    if (thumbnail?.tipo === "blob" && transport.sendPoster) {
      await transport.sendPoster(presign.thumb, thumbnail.blob);
    }

    await transport.confirm(item, presign);

    // Só remove depois do confirm aceito — remover antes é perder a foto se o confirm falhar, e o confirm é idempotente justamente para tolerar que esta remoção não aconteça.
    await queue.remove(item.id);

    return { estado: "enviado", id: item.id };
  } catch (e) {
    const motivo = e instanceof Error ? e.message : String(e);

    // Erro que não melhora com retry (sessão expirada, chave recusada, arquivo inválido) — insistir contra uma parede só atrasa as fotos seguintes da fila e esconde do convidado que aquela precisa de atenção.
    if (isTerminalError(e)) {
      return { estado: "desistiu", id: item.id, motivo };
    }

    await queue.markAttempt(item.id);

    return {
      estado: "retentar",
      id: item.id,
      esperaSegundos: retryWaitSeconds(item.tentativas + 1),
      motivo,
    };
  }
}

/** Estrutural, não por instanceof: o erro nasce no transporte que é do app, core não conhece as classes. */
function isTerminalError(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { definitivo?: unknown }).definitivo === true;
}

export type DrainSummary = {
  enviados: number;
  retentar: number;
  desistiram: number;
  resultados: SendResult[];
};

/** Em série de propósito: paralelo do mesmo aparelho satura o enlace de 200 celulares na mesma antena. */
export async function drain(
  queue: Queue,
  transport: Transport,
  options: { online: () => boolean; limit?: number } = { online: () => true },
): Promise<DrainSummary> {
  const items = await queue.list();
  const limit = options.limit ?? items.length;
  const resultados: SendResult[] = [];

  for (const item of items.slice(0, limit)) {
    // Reconfere a cada item: o sinal cai no meio da drenagem, e insistir
    // offline só queima tentativas de itens que ainda não falharam.
    if (!options.online()) break;
    resultados.push(await sendItem(item, transport, queue));
  }

  return {
    enviados: resultados.filter((r) => r.estado === "enviado").length,
    retentar: resultados.filter((r) => r.estado === "retentar").length,
    desistiram: resultados.filter((r) => r.estado === "desistiu").length,
    resultados,
  };
}
