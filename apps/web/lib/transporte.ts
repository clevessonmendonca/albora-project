import type { ItemFila, RespostaPresign, Transporte } from "@albora/core";

/**
 * O `Transporte` da web. Camada fina: a sequência e o retry vivem em
 * `@albora/core`, aqui só se fala com a rede.
 *
 * O corpo do item pode ser `Blob` (web) ou referência de arquivo (Expo). Esta
 * implementação só sabe do primeiro — e falha alto no segundo em vez de
 * mandar `undefined` para o storage, que gravaria um objeto de zero byte e
 * pareceria sucesso.
 */

function corpoDoItem(item: ItemFila): Blob {
  if (item.corpo.tipo !== "blob") {
    throw new Error(`corpo ${item.corpo.tipo} não é enviável pela web`);
  }
  return item.corpo.blob;
}

export const transporteWeb: Transporte = {
  async presign(item) {
    const res = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "content-type": "application/json" },
      // O cookie de sessão vai sozinho; o token nunca entra no corpo nem na
      // URL, e é de lá que o servidor tira o event_id para derivar a chave.
      credentials: "same-origin",
      body: JSON.stringify({
        uploadId: item.id,
        mime: item.mime,
        bytes: corpoDoItem(item).size,
      }),
    });

    if (!res.ok) throw new ErroDeApi("presign", res.status, await corpoDeErro(res));
    return (await res.json()) as RespostaPresign;
  },

  async enviarBytes(url, item) {
    // Direto no object storage. O servidor não vê estes bytes — é a regra do
    // caminho crítico, e o que faz a conta do produto fechar.
    const res = await fetch(url, {
      method: "PUT",
      body: corpoDoItem(item),
      headers: { "content-type": item.mime },
    });

    if (!res.ok) throw new ErroDeApi("put", res.status);
  },

  async confirmar(item, presign) {
    const res = await fetch("/api/uploads/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      // Os detalhes vão junto do confirm quando já existem. Se o convidado
      // ainda estiver digitando quando a foto subir, eles chegam pela rota de
      // anotação — a foto nunca espera o texto (§3.6).
      body: JSON.stringify({
        uploadId: item.id,
        chave: presign.chave,
        mime: item.mime,
        desafioId: item.desafioId ?? null,
        legenda: item.legenda ?? null,
        lugar: item.lugar ?? null,
      }),
    });

    if (!res.ok) throw new ErroDeApi("confirm", res.status, await corpoDeErro(res));
  },
};

async function corpoDeErro(res: Response): Promise<string | undefined> {
  try {
    const j = (await res.json()) as { code?: string };
    return j.code;
  } catch {
    return undefined;
  }
}

export class ErroDeApi extends Error {
  constructor(
    readonly etapa: "presign" | "put" | "confirm",
    readonly status: number,
    readonly codigo?: string,
  ) {
    super(`${etapa} ${status}${codigo ? ` (${codigo})` : ""}`);
  }

  /**
   * Erro que não melhora com retry: o item deve virar falha visível em vez de
   * queimar as seis tentativas contra uma parede.
   */
  get definitivo(): boolean {
    return this.status === 401 || this.status === 403 || this.status === 422;
  }
}
