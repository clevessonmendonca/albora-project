import { AwsClient } from "aws4fetch";
import { config } from "./config";

/**
 * Assinatura e inspeção no R2. O servidor emite URLs e lê metadados —
 * **nunca bytes de mídia**. É a regra do caminho crítico, e o spike da task
 * 001 mediu: 21 bytes de corpo no Worker contra 819 200 no storage.
 */

function cliente(): AwsClient {
  const { r2 } = config();
  return new AwsClient({
    accessKeyId: r2.accessKeyId,
    secretAccessKey: r2.secretAccessKey,
    service: "s3",
    region: "auto",
  });
}

function urlDoObjeto(chave: string): URL {
  const { r2 } = config();
  return new URL(`https://${r2.contaId}.r2.cloudflarestorage.com/${r2.bucket}/${chave}`);
}

export async function assinarPut(chave: string, mime: string, validadeSegundos: number) {
  const url = urlDoObjeto(chave);
  url.searchParams.set("X-Amz-Expires", String(validadeSegundos));

  // `allHeaders: false` deixa o content-type fora da assinatura, e é
  // deliberado: o navegador manda o dele e o PUT não quebra. Medido na task
  // 001 — `SignedHeaders: host`.
  const assinada = await cliente().sign(new Request(url, { method: "PUT", headers: { "content-type": mime } }), {
    aws: { signQuery: true, allHeaders: false },
  });

  return assinada.url;
}

export type MetadadosObjeto = { bytes: number; inicio: Uint8Array };

/**
 * Confere o que **de fato** chegou no bucket.
 *
 * Lê só os primeiros bytes, com Range: o suficiente para os magic bytes e
 * nada perto de trafegar a foto pelo servidor. É o que transforma "o cliente
 * disse que era JPEG" em "os primeiros bytes são de um JPEG".
 */
export async function inspecionarObjeto(chave: string): Promise<MetadadosObjeto | null> {
  const res = await cliente().fetch(urlDoObjeto(chave).toString(), {
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
