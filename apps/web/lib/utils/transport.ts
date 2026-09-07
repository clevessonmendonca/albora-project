import type { QueueItem, RespostaPresign, Transport } from "@albora/core";

/** Transport da web: sequência e retry em `@albora/core`; só `Blob` aqui — corpo não-Blob falha alto em vez de mandar `undefined` e gravar zero byte com aparência de sucesso. */

function corpoDoItem(item: QueueItem): Blob {
  if (item.corpo.tipo !== "blob") {
    throw new Error(`corpo ${item.corpo.tipo} não é enviável pela web`);
  }
  return item.corpo.blob;
}

export const webTransport: Transport = {
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

    if (!res.ok) throw new ApiError("presign", res.status, await corpoDeErro(res));
    return (await res.json()) as RespostaPresign;
  },

  async sendBytes(url, item) {
    // Direto no object storage. O servidor não vê estes bytes — é a regra do
    // caminho crítico, e o que faz a conta do produto fechar.
    const res = await fetch(url, {
      method: "PUT",
      body: corpoDoItem(item),
      headers: { "content-type": item.mime },
    });

    if (!res.ok) throw new ApiError("put", res.status);
  },

  async sendPoster(url, poster) {
    const res = await fetch(url, {
      method: "PUT",
      body: poster,
      headers: { "content-type": "image/jpeg" },
    });

    if (!res.ok) throw new ApiError("put", res.status);
  },

  async confirm(item, presign) {
    const res = await fetch("/api/uploads/confirm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      // Detalhes vão junto do confirm quando já existem — se o convidado ainda estiver digitando, chegam pela rota de anotação, a foto nunca espera o texto (§3.6).
      body: JSON.stringify({
        uploadId: item.id,
        chave: presign.chave,
        mime: item.mime,
        desafioId: item.desafioId ?? null,
        promptKey: item.promptKey ?? null,
        legenda: item.legenda ?? null,
        lugar: item.lugar ?? null,
        ...(item.story ? { story: true } : {}),
        ...(item.musicTrackId ? { musicTrackId: item.musicTrackId } : {}),
        ...(typeof item.capturadaEm === "number"
          ? {
              capturadaEm: new Date(item.capturadaEm).toISOString(),
              ...(item.capturadaEmParede ? { capturadaEmParede: true } : {}),
            }
          : {}),
        ...(typeof item.largura === "number" && typeof item.altura === "number"
          ? { largura: item.largura, altura: item.altura }
          : {}),
      }),
    });

    if (!res.ok) throw new ApiError("confirm", res.status, await corpoDeErro(res));
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

export class ApiError extends Error {
  constructor(
    readonly etapa: "presign" | "put" | "confirm",
    readonly status: number,
    readonly codigo?: string,
  ) {
    super(`${etapa} ${status}${codigo ? ` (${codigo})` : ""}`);
  }

  /** Erro que não melhora com retry: item deve virar falha visível em vez de queimar as seis tentativas contra uma parede. */
  get definitivo(): boolean {
    return this.status === 401 || this.status === 403 || this.status === 422;
  }
}
