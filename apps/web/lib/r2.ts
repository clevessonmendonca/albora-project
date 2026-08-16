import { AwsClient } from "aws4fetch";
import { config } from "./config";

/**
 * Assinatura, inspeção no confirm, e leitura da thumb no classificador.
 *
 * No caminho crítico (presign/confirm/parede) o servidor **não** trafega a
 * foto: emite URL e lê no máximo 16 bytes de magic. O classificador da spec
 * 011 é enriquecimento — lê só a thumb, com teto, fora do PUT do convidado.
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

/**
 * Confere o que **de fato** chegou no bucket.
 *
 * Lê só os primeiros bytes, com Range: o suficiente para os magic bytes e
 * nada perto de trafegar a foto pelo servidor. É o que transforma "o cliente
 * disse que era JPEG" em "os primeiros bytes são de um JPEG".
 */
export async function inspectObject(key: string): Promise<ObjectMetadata | null> {
  const res = await client().fetch(objectUrl(key).toString(), {
    method: "GET",
    headers: { range: "bytes=0-15" },
  });

  if (res.status === 404) return null;
  if (!res.ok && res.status !== 206) {
    throw new Error(`inspeção falhou: ${res.status}`);
  }

  const inicio = new Uint8Array(await res.arrayBuffer());

  // Content-Range vem como "bytes 0-15/819200"; o total é o que interessa.
  const total = res.headers.get("content-range")?.split("/")[1];
  const bytes = total ? Number(total) : Number(res.headers.get("content-length") ?? 0);

  return { bytes, inicio };
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
