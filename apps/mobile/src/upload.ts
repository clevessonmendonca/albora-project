import {
  drain,
  temGeolocalizacao,
  type DrainSummary,
  type Queue,
  type QueueItem,
  type RespostaPresign,
  type Transport,
} from "@albora/core";
import { apiOrigin, cookieHeader, type GuestSession } from "./session";

/**
 * EXIF/GPS: A câmera já captura com `exif: false`, mas fotos da galeria ou
 * HEIC convertidos podem trazer GPS. `stripGpsOrReject` bloqueia o PUT de
 * qualquer imagem com coordenadas (LGPD § 001), devolvendo erro definitivo.
 */

/** PUT a partir de arquivo — `URLSession` (iOS) / upload nativo (Android). */
export type PutFile = (opts: {
  caminho: string;
  url: string;
  mime: string;
}) => Promise<{ status: number }>;

export type NativeUploadDeps = {
  origin: string;
  cookie: string;
  readBytes: (path: string) => Promise<Uint8Array>;
  fetch?: typeof fetch;
  /** Sem isto, o PUT lê os bytes e usa `fetch` (testes / fallback). */
  putFile?: PutFile;
};

export function arquivoDoItem(item: QueueItem): { caminho: string; bytes: number } {
  if (item.corpo.tipo !== "arquivo") {
    throw Object.assign(new Error(`corpo ${item.corpo.tipo} não é enviável no app`), {
      definitivo: true,
    });
  }
  return item.corpo;
}

export function presignPayload(
  item: QueueItem,
  bytes: number,
): {
  uploadId: string;
  mime: string;
  bytes: number;
} {
  return { uploadId: item.id, mime: item.mime, bytes };
}

export function confirmPayload(item: QueueItem, chave: string): Record<string, unknown> {
  return {
    uploadId: item.id,
    chave,
    mime: item.mime,
    desafioId: item.desafioId ?? null,
    promptKey: item.promptKey ?? null,
    legenda: item.legenda ?? null,
    lugar: item.lugar ?? null,
    ...(typeof item.capturadaEm === "number"
      ? {
          capturadaEm: new Date(item.capturadaEm).toISOString(),
          ...(item.capturadaEmParede ? { capturadaEmParede: true } : {}),
        }
      : {}),
    ...(typeof item.largura === "number" && typeof item.altura === "number"
      ? { largura: item.largura, altura: item.altura }
      : {}),
  };
}

export class ApiError extends Error {
  constructor(
    readonly etapa: "presign" | "put" | "confirm",
    readonly status: number,
    readonly codigo?: string,
  ) {
    super(`${etapa} ${status}${codigo ? ` (${codigo})` : ""}`);
  }

  get definitivo(): boolean {
    return this.status === 401 || this.status === 403 || this.status === 422;
  }
}

async function codigoDeErro(res: Response): Promise<string | undefined> {
  try {
    const j = (await res.json()) as { code?: string };
    return j.code;
  } catch {
    return undefined;
  }
}

/**
 * Verifica GPS e rejeita o PUT se presente. Sem canvas nativo (F10 gap), não
 * há reencode para remover EXIF; bloqueio total é preferível a vazamento de
 * coordenadas. Mensagem de erro definitivo para não retentar.
 */
export function stripGpsOrReject(bytes: Uint8Array): void {
  if (temGeolocalizacao(bytes)) {
    throw Object.assign(
      new Error(
        "Esta foto contém localização GPS e não pode ser enviada. " +
        "Tire nova foto com a câmera do app, sem carregar da galeria.",
      ),
      { definitivo: true },
    );
  }
}

export function createNativeTransport(deps: NativeUploadDeps): Transport {
  const doFetch = deps.fetch ?? fetch;

  return {
    async presign(item) {
      const arquivo = arquivoDoItem(item);
      const res = await doFetch(`${deps.origin}/api/uploads/presign`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: deps.cookie,
        },
        body: JSON.stringify(presignPayload(item, arquivo.bytes)),
      });
      if (!res.ok) throw new ApiError("presign", res.status, await codigoDeErro(res));
      return (await res.json()) as RespostaPresign;
    },

    async sendBytes(url, item) {
      const arquivo = arquivoDoItem(item);
      const bytes = await deps.readBytes(arquivo.caminho);
      stripGpsOrReject(bytes);
      if (deps.putFile) {
        const { status } = await deps.putFile({
          caminho: arquivo.caminho,
          url,
          mime: item.mime,
        });
        if (status < 200 || status >= 300) throw new ApiError("put", status);
        return;
      }
      const copy = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
        ? bytes
        : bytes.slice();
      const res = await doFetch(url, {
        method: "PUT",
        headers: { "content-type": item.mime },
        body: new Blob([copy.buffer as ArrayBuffer], { type: item.mime }),
      });
      if (!res.ok) throw new ApiError("put", res.status);
    },

    async confirm(item, presign) {
      const res = await doFetch(`${deps.origin}/api/uploads/confirm`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: deps.cookie,
        },
        body: JSON.stringify(confirmPayload(item, presign.chave)),
      });
      if (!res.ok) throw new ApiError("confirm", res.status, await codigoDeErro(res));
    },
  };
}

export type DrainFileQueueOptions = {
  session: GuestSession | null;
  readBytes: (path: string) => Promise<Uint8Array>;
  removeFile: (path: string) => Promise<void>;
  online?: () => boolean;
  fetch?: typeof fetch;
  origin?: string;
  putFile?: PutFile;
};

let emCurso: Promise<DrainSummary> | null = null;

/**
 * Drena a fila em arquivo: presign → PUT no storage → confirm, com cookie
 * de sessão. A sequência vive em `@albora/core`; aqui só o transporte nativo.
 */
export async function drainFileQueue(
  queue: Queue,
  options: DrainFileQueueOptions,
): Promise<DrainSummary> {
  if (emCurso) return emCurso;

  emCurso = (async () => {
    if (!options.session) {
      return { enviados: 0, retentar: 0, desistiram: 0, resultados: [] };
    }

    const pendentes = await queue.list();
    const caminhos = new Map<string, string>();
    for (const item of pendentes) {
      if (item.corpo.tipo === "arquivo") {
        caminhos.set(item.id, item.corpo.caminho);
      }
    }

    const transport = createNativeTransport({
      origin: options.origin ?? apiOrigin(),
      cookie: cookieHeader(options.session.token),
      readBytes: options.readBytes,
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.putFile ? { putFile: options.putFile } : {}),
    });

    const summary = await drain(queue, transport, {
      online: options.online ?? (() => true),
    });

    for (const r of summary.resultados) {
      if (r.estado !== "enviado") continue;
      const caminho = caminhos.get(r.id);
      if (caminho) await options.removeFile(caminho).catch(() => undefined);
    }

    return summary;
  })();

  try {
    return await emCurso;
  } finally {
    emCurso = null;
  }
}
