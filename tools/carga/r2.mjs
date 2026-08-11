/**
 * Assinatura SigV4 mínima, só para a limpeza apagar o que o teste gravou.
 *
 * Escrito à mão em vez de usar `aws4fetch` porque a biblioteca só está
 * instalada em `apps/web`, e alcançar o `node_modules` de outro pacote do
 * workspace é uma dependência que nenhum manifesto declara — quebra na
 * primeira instalação limpa, e quebra na limpeza, que é quando ninguém está
 * olhando.
 *
 * As credenciais saem do ambiente. Quando não estiverem lá, a limpeza do
 * storage é pulada e dita em voz alta, nunca fingida.
 */

import { createHash, createHmac } from "node:crypto";

/** @param {string|Uint8Array} dado */
function sha256(dado) {
  return createHash("sha256").update(dado).digest("hex");
}

function hmac(chave, dado) {
  return createHmac("sha256", chave).update(dado).digest();
}

const VAZIO = sha256("");

/** @param {Record<string, string|undefined>} env */
export function credenciaisDoAmbiente(env) {
  const contaId = env.R2_ACCOUNT_ID;
  const accessKeyId = env.R2_ACCESS_KEY_ID;
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
  const bucket = env.R2_BUCKET;

  if (!contaId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return { contaId, accessKeyId, secretAccessKey, bucket };
}

/**
 * @param {ReturnType<typeof credenciaisDoAmbiente>} cred
 * @param {"DELETE"|"HEAD"} metodo
 * @param {string} chave
 */
function assinar(cred, metodo, chave) {
  const anfitriao = `${cred.contaId}.r2.cloudflarestorage.com`;
  const caminho = `/${cred.bucket}/${chave}`
    .split("/")
    .map((p) => encodeURIComponent(p))
    .join("/");

  const agora = new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
  const dia = agora.slice(0, 8);
  const escopo = `${dia}/auto/s3/aws4_request`;

  const canonico = [
    metodo,
    caminho,
    "",
    `host:${anfitriao}`,
    `x-amz-content-sha256:${VAZIO}`,
    `x-amz-date:${agora}`,
    "",
    "host;x-amz-content-sha256;x-amz-date",
    VAZIO,
  ].join("\n");

  const paraAssinar = ["AWS4-HMAC-SHA256", agora, escopo, sha256(canonico)].join("\n");

  let chaveDerivada = hmac(`AWS4${cred.secretAccessKey}`, dia);
  for (const parte of ["auto", "s3", "aws4_request"]) {
    chaveDerivada = hmac(chaveDerivada, parte);
  }
  const assinatura = createHmac("sha256", chaveDerivada).update(paraAssinar).digest("hex");

  return {
    url: `https://${anfitriao}${caminho}`,
    cabecalhos: {
      host: anfitriao,
      "x-amz-content-sha256": VAZIO,
      "x-amz-date": agora,
      authorization:
        `AWS4-HMAC-SHA256 Credential=${cred.accessKeyId}/${escopo}, ` +
        `SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${assinatura}`,
    },
  };
}

/**
 * Apaga um objeto. 204 e 404 são os dois resultados bons — o segundo é a
 * limpeza rodando duas vezes, que precisa ser inofensivo.
 *
 * @returns {Promise<{ok:boolean, status:number}>}
 */
export async function apagarObjeto(cred, chave) {
  const { url, cabecalhos } = assinar(cred, "DELETE", chave);
  const res = await fetch(url, { method: "DELETE", headers: cabecalhos });
  return { ok: res.status === 204 || res.status === 404, status: res.status };
}

/** Existe para a limpeza poder provar que apagou, em vez de declarar. */
export async function objetoExiste(cred, chave) {
  const { url, cabecalhos } = assinar(cred, "HEAD", chave);
  const res = await fetch(url, { method: "HEAD", headers: cabecalhos });
  return res.status === 200;
}
