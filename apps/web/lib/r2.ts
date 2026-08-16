import { PREFIXO_MAGIC_BYTES } from "@albora/core";
import { AwsClient } from "aws4fetch";
import { config } from "./config";

/**
 * Assinatura, inspeção no confirm, e leitura da thumb no classificador.
 *
 * No caminho crítico (presign/confirm/parede) o servidor **não** trafega a
 * foto: emite URL e lê no máximo `PREFIXO_MAGIC_BYTES` do objeto `/full`.
 * O classificador da spec 011 é enriquecimento — lê só a thumb, com teto,
 * fora do PUT do convidado. Magic bytes da thumb não substituem o confirm.
 */

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

  // `allHeaders: false` deixa o content-type fora da assinatura, e é
  // deliberado: o navegador manda o dele e o PUT não quebra. Medido na task
  // 001 — `SignedHeaders: host`.
  const signed = await client().sign(new Request(url, { method: "PUT", headers: { "content-type": mime } }), {
    aws: { signQuery: true, allHeaders: false },
  });

  return signed.url;
}

/**
 * O caminho de leitura, irmão do `signPut`: o navegador busca os bytes no
 * storage, e o servidor continua sem tocá-los.
 *
 * A assinatura prende a chave — trocar `/full` por `/thumb` na URL emitida dá
 * 403, medido contra o bucket. E o `content-disposition` vai explícito porque
 * o que o R2 guardou veio do cliente, e §4.3 de `docs/security.md` exige que
 * a resposta declare o que é.
 */
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

/**
 * Interpreta a resposta do GET com Range. Copia só o prefixo — se o storage
 * ignorar o Range e devolver o objeto inteiro (200), o ArrayBuffer grande
 * não fica preso no `inicio` via `subarray`.
 */
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

/**
 * Confere o que **de fato** chegou no bucket — a variante `/full`, no confirm.
 *
 * Lê só os primeiros bytes, com Range: o suficiente para os magic bytes e
 * nada perto de trafegar a foto pelo servidor. É o que transforma "o cliente
 * disse que era JPEG" em "os primeiros bytes são de um JPEG".
 */
export async function inspectObject(key: string): Promise<ObjectMetadata | null> {
  const res = await client().fetch(objectUrl(key).toString(), {
    method: "GET",
    headers: { Range: rangeDoPrefixoMagic() },
  });

  return metadadosDaInspecao(res.status, res.headers, new Uint8Array(await res.arrayBuffer()));
}

/**
 * Lê o objeto como stream. O export do acervo puxa um arquivo por vez e
 * joga no ZIP — `arrayBuffer()` aqui carregaria a noite inteira na memória.
 */
export async function streamObject(key: string): Promise<ReadableStream<Uint8Array> | null> {
  const res = await client().fetch(objectUrl(key).toString(), { method: "GET" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`leitura falhou: ${res.status}`);
  return res.body;
}

const TETO_DA_THUMB = 512 * 1024;

/**
 * Lê a thumb para o classificador (spec 011). Fora do caminho crítico: o
 * upload continua PUT direto no storage. Teto de 512 KiB — a thumb é barata
 * de propósito; objeto maior que isso não é thumb e o classificador cala.
 */
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
