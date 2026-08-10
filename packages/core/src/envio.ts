import { deveDesistir, esperaAntesDeRetentar, type Fila, type ItemFila } from "./fila";
import type { RespostaPresign } from "./upload";

/**
 * O orquestrador de envio: pega um item da fila e o leva até o `confirm`.
 *
 * Mora em `core` porque a **sequência** é a mesma nas duas superfícies — o que
 * muda é o transporte, que cada app injeta (ADR 0010). Duas cópias desta
 * ordem divergiriam em silêncio, e o sintoma seria foto que sobe na web e
 * some no app.
 */

export type Transporte = {
  presign(item: ItemFila): Promise<RespostaPresign>;
  enviarBytes(url: string, item: ItemFila): Promise<void>;
  confirmar(item: ItemFila, presign: RespostaPresign): Promise<void>;
};

export type Resultado =
  | { estado: "enviado"; id: string }
  | { estado: "retentar"; id: string; esperaSegundos: number; motivo: string }
  | { estado: "desistiu"; id: string; motivo: string };

/**
 * Envia um item. **Nunca lança** — devolve o que aconteceu.
 *
 * Um envio que estoura no meio de um laço derruba os itens seguintes junto, e
 * aí uma foto corrompida leva as outras nove embora. O erro é valor, não
 * exceção, justamente para o laço continuar.
 */
export async function enviarItem(
  item: ItemFila,
  transporte: Transporte,
  fila: Fila,
): Promise<Resultado> {
  if (deveDesistir(item)) {
    // Desistir **não** apaga o item: ele vira falha visível na galeria, com
    // "tentar de novo". Apagar em silêncio é a foto sumindo sem explicação,
    // que é o pior modo de falha deste produto.
    return { estado: "desistiu", id: item.id, motivo: "tentativas esgotadas" };
  }

  try {
    const presign = await transporte.presign(item);

    // A ordem importa: os bytes vão para o storage **antes** do confirm. Um
    // confirm que chega primeiro cria linha apontando para objeto que não
    // existe — foto na galeria que não abre.
    await transporte.enviarBytes(presign.full, item);
    await transporte.confirmar(item, presign);

    // Só remove depois do confirm aceito. Remover antes é perder a foto se o
    // confirm falhar, e o confirm é idempotente justamente para tolerar que
    // esta remoção não aconteça.
    await fila.remover(item.id);

    return { estado: "enviado", id: item.id };
  } catch (e) {
    await fila.marcarTentativa(item.id);
    const tentativas = item.tentativas + 1;

    return {
      estado: "retentar",
      id: item.id,
      esperaSegundos: esperaAntesDeRetentar(tentativas),
      motivo: e instanceof Error ? e.message : String(e),
    };
  }
}

export type ResumoDrenagem = {
  enviados: number;
  retentar: number;
  desistiram: number;
  resultados: Resultado[];
};

/**
 * Drena a fila inteira, em série.
 *
 * Em série de propósito: 200 celulares na mesma antena já saturam o enlace, e
 * subir dez fotos em paralelo do mesmo aparelho piora o tempo de todo mundo —
 * inclusive o dele. A fila existe para espalhar no tempo, não para amontoar.
 */
export async function drenar(
  fila: Fila,
  transporte: Transporte,
  opcoes: { online: () => boolean; maximo?: number } = { online: () => true },
): Promise<ResumoDrenagem> {
  const itens = await fila.listar();
  const limite = opcoes.maximo ?? itens.length;
  const resultados: Resultado[] = [];

  for (const item of itens.slice(0, limite)) {
    // Reconfere a cada item: o sinal cai no meio da drenagem, e insistir
    // offline só queima tentativas de itens que ainda não falharam.
    if (!opcoes.online()) break;
    resultados.push(await enviarItem(item, transporte, fila));
  }

  return {
    enviados: resultados.filter((r) => r.estado === "enviado").length,
    retentar: resultados.filter((r) => r.estado === "retentar").length,
    desistiram: resultados.filter((r) => r.estado === "desistiu").length,
    resultados,
  };
}
