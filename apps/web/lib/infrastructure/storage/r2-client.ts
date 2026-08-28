import { PREFIXO_MAGIC_BYTES } from "@albora/core";
import { AwsClient } from "aws4fetch";
import { config } from "./config";

/** Servidor não trafega foto: emite URL presignada e lê no máximo `PREFIXO_MAGIC_BYTES` no confirm. Classificador lê só a thumb (spec 011), fora do PUT do convidado. */

function client(): AwsClient {
  const { r2 } = config();
  return new AwsClient({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function objectUrl(key: string): URL {
  const { r2, mediaOrigin } = config();
  return new URL(`https://${mediaOrigin}/${r2.bucket}/${key}`);
}

export async function signPut(key: string, mime: string, ttlSeconds: number) {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(ttlSeconds));

  // `allHeaders: false` deixa content-type fora da assinatura de propósito — o navegador manda o dele e o PUT não quebra (medido na task 001, `SignedHeaders: host`).
  const signed = await client().sign(new Request(url, { method: "PUT", headers: { "content-type": mime } }), {
    aws: { signQuery: true, allHeaders: false },
  });

  return signed.url;
}

/** Assinatura prende a chave — trocar `/full` por `/thumb` dá 403; `content-disposition` explícito: §4.3 exige que a resposta declare o que é. */
export async function signGet(key: string, ttlSeconds: number) {
  const url = objectUrl(key);
  url.searchParams.set("X-Amz-Expires", String(ttlSeconds));
  url.searchParams.set("response-content-disposition", "inline");

  const signed = await client().sign(new Request(url, { method: "GET" }), {
    aws: { signQuery: true, allHeaders: false },
  });

  return signed.url;
}

export type ObjectMetadata = { bytes: number; inicio: Uint8Array };

export function rangeDoPrefixoMagic(): string {
  return `bytes=0-${PREFIXO_MAGIC_BYTES - 1}`;
}

/** Interpreta GET com Range — copia só o prefixo; se storage ignorar Range (200), ArrayBuffer grande não fica preso em `inicio`. */
export function metadadosDaInspecao(
  status: number,
  headers: Headers,
  corpo: Uint8Array,
): ObjectMetadata | null {
  if (status === 404) return null;
  if (status !== 200 && status !== 206) {
    throw new Error(`inspeção falhou: ${status}`);
  }

  const tam = Math.min(corpo.byteLength, PREFIXO_MAGIC_BYTES);
  const inicio = new Uint8Array(tam);
  inicio.set(corpo.subarray(0, tam));

  const total = headers.get("content-range")?.split("/")[1];
  const bytes = total ? Number(total) : Number(headers.get("content-length") ?? corpo.byteLength);

  return { bytes, inicio };
}

/** Confere o que chegou no bucket (confirm): lê só os primeiros bytes com Range — transforma "cliente disse JPEG" em "bytes são JPEG". */
export async function inspectObject(key: string): Promise<ObjectMetadata | null> {
  const res = await client().fetch(objectUrl(key).toString(), {
    method: "GET",
    headers: { Range: rangeDoPrefixoMagic() },
  });

  return metadadosDaInspecao(res.status, res.headers, new Uint8Array(await res.arrayBuffer()));
}

/** Lê como stream — export puxa um arquivo por vez para o ZIP; `arrayBuffer()` carregaria a noite inteira na memória. */
export async function streamObject(key: string): Promise<ReadableStream<Uint8Array> | null> {
  const res = await client().fetch(objectUrl(key).toString(), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`leitura falhou: ${res.status}`);
  return res.body;
}

const TETO_DA_THUMB = 512 * 1024;

/** Lê a thumb para o classificador (spec 011) — fora do crítico; teto 512 KiB: maior que isso não é thumb e o classificador cala. */
export async function readThumb(key: string): Promise<Uint8Array | null> {
  const res = await client().fetch(objectUrl(key).toString(), {
    method: "GET",
    headers: { range: `bytes=0-${TETO_DA_THUMB - 1}` },
  });

  if (res.status === 404) return null;
  if (!res.ok && res.status !== 206) {
    throw new Error(`leitura da thumb falhou: ${res.status}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

/** Só o D365 apaga (retention.mjs) — outros caminhos mudam `uploads.state`, bytes ficam. 404 conta como sucesso: idempotente por desenho. */
export async function deleteObject(key: string): Promise<void> {
  const url = objectUrl(key);
  const signed = await client().sign(new Request(url, { method: "DELETE" }), {
    aws: { signQuery: true, allHeaders: false },
  });
  const res = await fetch(signed.url, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new Error(`purge falhou: ${res.status}`);
  }
}

/** Bufferiza o objeto — stopgap para export síncrono (spec §9, fase 4); quando a fila chegar, usar `streamObject` por stream/chunk. */
export async function bufferObject(key: string): Promise<Uint8Array | null> {
  const stream = await streamObject(key);
  if (!stream) return null;

  const reader = stream.getReader();
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        partes.push(value);
        total += value.byteLength;
      }
    }
  } finally {
    reader.releaseLock();
  }

  const saida = new Uint8Array(total);
  let offset = 0;
  for (const parte of partes) {
    saida.set(parte, offset);
    offset += parte.byteLength;
  }
  return saida;
}

/** @deprecated use signPut */
export const assinarPut = signPut;

/** @deprecated use signGet */
export const assinarGet = signGet;

/** @deprecated use inspectObject */
export const inspecionarObjeto = inspectObject;

/** @deprecated use readThumb */
export const lerThumb = readThumb;

/** @deprecated use ObjectMetadata */
export type MetadadosObjeto = ObjectMetadata;
